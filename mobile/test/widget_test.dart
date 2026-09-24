// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';

import 'package:app_sih/main.dart';

void main() {
  testWidgets('Role Selection Page renders welcome text', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RoleSelectionApp());

    // Verify that the role selection page texts are shown
    expect(find.text('Welcome'), findsOneWidget);
    expect(find.text('Select your role to continue'), findsOneWidget);
  });
}
