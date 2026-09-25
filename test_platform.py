import sys
import os
sys.path.insert(0, os.path.abspath("backend"))

import unittest
import pandas as pd
from app.services.excel_parser import load_sheet_dataframe
from app.core.type_classifier import classify_field_type
from app.core.profiler import profile_dataframe
from app.core.recommendation_engine import generate_recommendations, get_unavailable_chart_reasons
from app.core.quality_checker import evaluate_data_quality
from app.services.aggregator import build_chart_data
from app.models.schemas import FieldType, ChartType

class TestOfflineExcelPlatform(unittest.TestCase):

    def test_dataset_a_sales(self):
        print("\n=== Testing Dataset A (Sales Transactions) ===")
        df = load_sheet_dataframe(open("sample_data/Dataset_A_Sales.xlsx", "rb").read(), "Dataset_A_Sales.xlsx", "Transactions")
        self.assertFalse(df.empty)

        profiles = profile_dataframe(df)
        self.assertEqual(len(profiles), 5)

        profile_map = {p.name: p.effective_type for p in profiles}
        print("Inferred Field Types:", profile_map)

        self.assertEqual(profile_map["Transaction_Date"], FieldType.DATE)
        self.assertEqual(profile_map["Region"], FieldType.CATEGORICAL)
        self.assertEqual(profile_map["Category"], FieldType.CATEGORICAL)
        self.assertIn(profile_map["Amount"], [FieldType.DECIMAL, FieldType.INTEGER])
        self.assertIn(profile_map["Quantity"], [FieldType.INTEGER, FieldType.DECIMAL])

        recs = generate_recommendations(profiles)
        print(f"Generated {len(recs)} Recommendations:")
        for r in recs:
            print(f" - [{r.chart_type}] {r.title} ({r.reasoning})")
        self.assertGreaterEqual(len(recs), 4)

        report = evaluate_data_quality(df, profiles)
        print(f"Quality Report (Health Score: {report.health_score}):")
        print(f" - Duplicate rows: {report.duplicate_rows_count}")
        print(f" - Issues logged: {len(report.issues)}")
        self.assertGreater(report.duplicate_rows_count, 0)

        # Test Aggregation
        data, keys, _ = build_chart_data(df, ChartType.BAR, {"x": "Category", "y": "Amount"}, "sum", None, profiles)
        self.assertGreater(len(data), 0)

    def test_dataset_b_employees(self):
        print("\n=== Testing Dataset B (HR Personnel) ===")
        df = load_sheet_dataframe(open("sample_data/Dataset_B_Employees.xlsx", "rb").read(), "Dataset_B_Employees.xlsx", "Sheet1")
        self.assertFalse(df.empty)

        profiles = profile_dataframe(df)
        profile_map = {p.name: p.effective_type for p in profiles}
        print("Inferred Field Types:", profile_map)

        # Employee_ID must be identified as Identifier!
        self.assertEqual(profile_map["Employee_ID"], FieldType.IDENTIFIER)
        self.assertEqual(profile_map["Department"], FieldType.CATEGORICAL)
        self.assertEqual(profile_map["Joining_Date"], FieldType.DATE)

        # Performance_Rating (1..5) low cardinality numeric should have ambiguity warning
        rating_prof = next(p for p in profiles if p.name == "Performance_Rating")
        self.assertIsNotNone(rating_prof.ambiguity_warning)
        print(f"Ambiguity Warning for {rating_prof.name}: {rating_prof.ambiguity_warning}")

        recs = generate_recommendations(profiles)
        self.assertGreaterEqual(len(recs), 4)

        # Ensure Identifier is NOT used as numeric measure in recommendations
        for r in recs:
            if "y" in r.fields:
                self.assertNotEqual(r.fields["y"], "Employee_ID")

        report = evaluate_data_quality(df, profiles)
        print(f"Quality Report (Health Score: {report.health_score}):")
        self.assertTrue(any(i.issue_type == "outliers" for i in report.issues))

    def test_dataset_c_students(self):
        print("\n=== Testing Dataset C (Student Marks) ===")
        df = load_sheet_dataframe(open("sample_data/Dataset_C_Students.xlsx", "rb").read(), "Dataset_C_Students.xlsx", "Sheet1")
        self.assertFalse(df.empty)

        profiles = profile_dataframe(df)
        profile_map = {p.name: p.effective_type for p in profiles}
        print("Inferred Field Types:", profile_map)

        self.assertEqual(profile_map["Student_ID"], FieldType.IDENTIFIER)
        self.assertEqual(profile_map["Course"], FieldType.CATEGORICAL)
        self.assertIn(profile_map["Marks"], [FieldType.DECIMAL, FieldType.INTEGER])
        self.assertIn(profile_map["Attendance_Pct"], [FieldType.DECIMAL, FieldType.INTEGER])

        recs = generate_recommendations(profiles)
        self.assertGreaterEqual(len(recs), 4)

        unavailable = get_unavailable_chart_reasons(profiles)
        print("Unavailable charts due to dataset structure:")
        for u in unavailable:
            print(f" - [{u.chart_type}] {u.reason}")
        # Dataset C has no Date column, so Line chart should be unavailable
        self.assertTrue(any(u.chart_type == ChartType.LINE for u in unavailable))

if __name__ == "__main__":
    unittest.main()
