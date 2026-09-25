import pandas as pd
import numpy as np
from typing import List, Dict, Any
from app.models.schemas import DataQualityReport, QualityIssue, FieldProfile, FieldType

def evaluate_data_quality(df: pd.DataFrame, profiles: List[FieldProfile]) -> DataQualityReport:
    total_rows, total_cols = df.shape
    issues: List[QualityIssue] = []
    
    # 1. Duplicate rows
    dup_mask = df.duplicated()
    dup_count = int(dup_mask.sum())
    dup_preview = []
    if dup_count > 0:
        dup_preview = df[dup_mask].head(5).to_dict(orient="records")
        issues.append(QualityIssue(
            issue_type="duplicate_rows",
            severity="warning" if dup_count < 0.1 * total_rows else "error",
            description=f"Found {dup_count} duplicate row(s) ({(dup_count/total_rows)*100:.1f}% of total).",
            affected_count=dup_count,
            affected_pct=round((dup_count/total_rows)*100, 2),
            details={"preview": dup_preview}
        ))

    empty_cols = []
    constant_cols = []
    suspected_ids = []
    
    # Profile iteration
    for p in profiles:
        col_name = p.name
        
        # Missing values
        if p.missing_count > 0:
            sev = "error" if p.missing_pct > 30 else ("warning" if p.missing_pct > 5 else "info")
            issues.append(QualityIssue(
                field=col_name,
                issue_type="missing_values",
                severity=sev,
                description=f"Column '{col_name}' has {p.missing_count} missing value(s) ({p.missing_pct}%).",
                affected_count=p.missing_count,
                affected_pct=p.missing_pct
            ))

        # Empty columns
        if p.non_null_count == 0:
            empty_cols.append(col_name)
            issues.append(QualityIssue(
                field=col_name,
                issue_type="empty_column",
                severity="error",
                description=f"Column '{col_name}' is completely empty (100% missing values).",
                affected_count=total_rows,
                affected_pct=100.0
            ))

        # Constant columns
        if p.non_null_count > 1 and p.unique_count == 1:
            constant_cols.append(col_name)
            issues.append(QualityIssue(
                field=col_name,
                issue_type="constant_column",
                severity="warning",
                description=f"Column '{col_name}' contains a constant single value ('{p.mode}'). Zero variance.",
                affected_count=p.non_null_count,
                affected_pct=round((p.non_null_count/total_rows)*100, 2)
            ))

        # Suspected Identifiers
        if p.effective_type == FieldType.IDENTIFIER:
            suspected_ids.append(col_name)

        # Outliers
        if p.has_outliers:
            issues.append(QualityIssue(
                field=col_name,
                issue_type="outliers",
                severity="info",
                description=f"Column '{col_name}' contains {p.outlier_count} statistical outlier(s) based on IQR bounds.",
                affected_count=p.outlier_count,
                affected_pct=round((p.outlier_count/p.non_null_count)*100, 2) if p.non_null_count > 0 else 0.0
            ))

        # Ambiguity warnings
        if p.ambiguity_warning:
            issues.append(QualityIssue(
                field=col_name,
                issue_type="ambiguity_type",
                severity="info",
                description=f"Column '{col_name}': {p.ambiguity_warning}",
                affected_count=p.non_null_count,
                affected_pct=round((p.non_null_count/total_rows)*100, 2)
            ))

    # Health Score computation
    # Starts at 100, deducts points based on issue severity
    score = 100
    for issue in issues:
        if issue.severity == "error":
            score -= 15
        elif issue.severity == "warning":
            score -= 5
        elif issue.severity == "info":
            score -= 1
    health_score = max(0, min(100, score))

    return DataQualityReport(
        total_rows=total_rows,
        total_cols=total_cols,
        health_score=health_score,
        duplicate_rows_count=dup_count,
        duplicate_preview=dup_preview,
        empty_columns=empty_cols,
        constant_columns=constant_cols,
        suspected_identifiers=suspected_ids,
        issues=issues
    )
