import logging
from django.utils import timezone
from audit.models import AccessLog, AuditLog
from cases.models import CaseAssignment

logger = logging.getLogger(__name__)

def score_access_event(access_log_entry) -> float:
    """
    Computes an anomaly score (0.0 to 1.0) for an access log entry.
    Scores above 0.7 set flagged = True.
    Uses scikit-learn IsolationForest if sufficient data exists; falls back to statistical rule scoring.
    """
    user = access_log_entry.user
    doc = access_log_entry.document
    
    # Calculate baseline rule-based scores first (highly reliable fallback)
    now = access_log_entry.timestamp or timezone.now()
    hour = now.hour
    day = now.weekday()
    
    score = 0.1 # Base baseline score
    
    # Rule 1: Off-hours access (10 PM to 6 AM)
    if hour >= 22 or hour <= 6:
        score += 0.3
        
    # Rule 2: Unassigned case access (critical anomaly!)
    if doc and doc.case:
        is_assigned = CaseAssignment.objects.filter(case=doc.case, user=user).exists()
        if not is_assigned and user.role != 'ADMIN':
            score += 0.5 # High warning weight
            
    # Rule 3: High access frequency in the last hour
    one_hour_ago = now - timezone.timedelta(hours=1)
    recent_access_count = AccessLog.objects.filter(
        user=user,
        timestamp__gte=one_hour_ago
    ).count()
    
    if recent_access_count > 15:
        score += 0.4
    elif recent_access_count > 5:
        score += 0.15

    # 4. Try scikit-learn IsolationForest if we have enough historical data
    # (requires at least 15 logs to train a minimal model)
    total_logs = AccessLog.objects.all().count()
    if total_logs >= 15:
        try:
            import numpy as np
            from sklearn.ensemble import IsolationForest
            
            # Fetch last 100 entries for training
            historical_logs = AccessLog.objects.all().order_by('-timestamp')[:100]
            
            X_train = []
            for log in historical_logs:
                log_time = log.timestamp or timezone.now()
                log_hour = log_time.hour
                log_day = log_time.weekday()
                
                # Check case assignment
                assigned = 1
                if log.document and log.document.case and log.user.role != 'ADMIN':
                    assigned = 1 if CaseAssignment.objects.filter(case=log.document.case, user=log.user).exists() else 0
                
                # Count accesses in 1-hour window relative to that log
                log_1h_ago = log_time - timezone.timedelta(hours=1)
                count_1h = AccessLog.objects.filter(
                    user=log.user, 
                    timestamp__gte=log_1h_ago, 
                    timestamp__lte=log_time
                ).count()
                
                X_train.append([log_hour, log_day, assigned, count_1h])
                
            # Current event features
            curr_assigned = 1
            if doc and doc.case and user.role != 'ADMIN':
                curr_assigned = 1 if CaseAssignment.objects.filter(case=doc.case, user=user).exists() else 0
                
            X_current = [[hour, day, curr_assigned, recent_access_count]]
            
            # Train Isolation Forest
            clf = IsolationForest(n_estimators=50, random_state=42, contamination=0.1)
            clf.fit(X_train)
            
            # Decision function returns negative for anomalies
            raw_anomaly = clf.decision_function(X_current)[0]
            
            # Map decision function score to a 0.0 - 1.0 range
            # Decision function usually sits between -0.5 (most anomalous) and 0.5 (most normal)
            forest_score = float(1.0 - (raw_anomaly + 0.5))
            forest_score = max(0.0, min(1.0, forest_score))
            
            # Blend statistical score with ML model score
            score = (score * 0.4) + (forest_score * 0.6)
            
        except Exception as e:
            logger.error(f"Isolation Forest scoring failed: {e}")

    # Clip score between 0.0 and 1.0
    return max(0.0, min(1.0, score))
