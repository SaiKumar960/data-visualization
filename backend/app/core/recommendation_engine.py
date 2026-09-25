from typing import List, Dict, Any
from app.models.schemas import FieldProfile, FieldType, Recommendation, ChartType, UnavailableChartReason

def generate_recommendations(profiles: List[FieldProfile]) -> List[Recommendation]:
    """
    Generates deterministic chart recommendations strictly driven by effective field types.
    Supports case count breakdowns, categorical mix, stacked volume breakdowns, and numeric aggregations.
    Zero domain knowledge or column name assumptions!
    """
    recs: List[Recommendation] = []
    
    dates = [p for p in profiles if p.effective_type in (FieldType.DATE, FieldType.DATETIME)]
    numerics = [p for p in profiles if p.effective_type in (FieldType.INTEGER, FieldType.DECIMAL)]
    categoricals = [p for p in profiles if p.effective_type in (FieldType.CATEGORICAL, FieldType.BOOLEAN)]
    
    rec_counter = 1

    # Rule A: 2 Categoricals -> Stacked Bar & Grouped Bar for Case Volume Mix (e.g., PA/CI by Uploader)
    if len(categoricals) >= 2:
        c1, c2 = categoricals[0], categoricals[1]
        
        # Primary Numeric if available, else row count
        primary_numeric = numerics[0].name if numerics else None

        recs.append(Recommendation(
            id=f"rec_{rec_counter}",
            title=f"{c2.name} Mix by {c1.name}",
            description=f"Stacked category breakdown of {c2.name} across {c1.name}.",
            chart_type=ChartType.STACKED_BAR,
            fields={"x": c1.name, "y": primary_numeric or "", "group": c2.name},
            default_aggregation="sum" if primary_numeric else "count",
            reasoning=f"Paired 2 Categorical fields ('{c1.name}', '{c2.name}') for stacked volume distribution."
        ))
        rec_counter += 1

        recs.append(Recommendation(
            id=f"rec_{rec_counter}",
            title=f"{c1.name} Breakdown ({c2.name} Comparison)",
            description=f"Grouped comparison of {c1.name} split by {c2.name}.",
            chart_type=ChartType.GROUPED_BAR,
            fields={"x": c1.name, "y": primary_numeric or "", "group": c2.name},
            default_aggregation="sum" if primary_numeric else "count",
            reasoning=f"Grouped breakdown of {c1.name} by {c2.name}."
        ))
        rec_counter += 1

    # Rule B: 1 Categorical Part-to-Whole Donut Chart (e.g. Category Mix PA/CI)
    for c in categoricals:
        if c.unique_count <= 10 and c.unique_count >= 2:
            primary_num = numerics[0].name if numerics else None
            recs.append(Recommendation(
                id=f"rec_{rec_counter}",
                title=f"{c.name} Category Mix",
                description=f"Volume and proportion breakdown across {c.name} categories.",
                chart_type=ChartType.DONUT,
                fields={"x": c.name, "y": primary_num or ""},
                default_aggregation="sum" if primary_num else "count",
                reasoning=f"Low cardinality categorical '{c.name}' ({c.unique_count} categories) for part-to-whole donut mix."
            ))
            rec_counter += 1
            break

    # Rule C: 1 Date/DateTime + Numeric or Count -> Line / Area Chart
    if dates:
        d = dates[0]
        primary_num = numerics[0].name if numerics else None
        recs.append(Recommendation(
            id=f"rec_{rec_counter}",
            title=f"{primary_num or 'Case Volume'} over {d.name}",
            description=f"Time series trend of {primary_num or 'volume'} across {d.name}.",
            chart_type=ChartType.LINE,
            fields={"x": d.name, "y": primary_num or ""},
            default_aggregation="sum" if primary_num else "count",
            reasoning=f"Time-series trend analysis over '{d.name}'."
        ))
        rec_counter += 1

        recs.append(Recommendation(
            id=f"rec_{rec_counter}",
            title=f"Cumulative Volume over {d.name}",
            description=f"Accumulated volume area chart over time.",
            chart_type=ChartType.AREA,
            fields={"x": d.name, "y": primary_num or ""},
            default_aggregation="sum" if primary_num else "count",
            reasoning=f"Cumulative area trend for '{d.name}'."
        ))
        rec_counter += 1

    # Rule D: Categorical + Numeric Measures (e.g. Amt by Uploader, Points by Uploader)
    for c in categoricals:
        for n in numerics:
            if c.unique_count > 30:
                recs.append(Recommendation(
                    id=f"rec_{rec_counter}",
                    title=f"Top 10 {c.name} by {n.name}",
                    description=f"Ranked view of the top categories in {c.name} by {n.name}.",
                    chart_type=ChartType.TOP_N_BAR,
                    fields={"x": c.name, "y": n.name},
                    default_aggregation="sum",
                    reasoning=f"High cardinality categorical '{c.name}' ({c.unique_count} values) defaulted to Top-N ranked bar.",
                    is_top_n_default=True,
                    top_n=10
                ))
                rec_counter += 1
            else:
                recs.append(Recommendation(
                    id=f"rec_{rec_counter}",
                    title=f"Total {n.name} by {c.name}",
                    description=f"Compare total {n.name} across {c.name} categories.",
                    chart_type=ChartType.BAR,
                    fields={"x": c.name, "y": n.name},
                    default_aggregation="sum",
                    reasoning=f"Paired Categorical field '{c.name}' with Numeric measure '{n.name}'."
                ))
                rec_counter += 1
            break
        if len(recs) >= 7:
            break

    # Rule E: Heatmap for 2 Categoricals + 1 Numeric
    if len(categoricals) >= 2 and len(numerics) >= 1:
        c1, c2 = categoricals[0], categoricals[1]
        n = numerics[0]
        if c1.unique_count <= 20 and c2.unique_count <= 20:
            recs.append(Recommendation(
                id=f"rec_{rec_counter}",
                title=f"Heatmap: {n.name} by {c1.name} × {c2.name}",
                description=f"2D cross-tabulation matrix of {n.name} intensity.",
                chart_type=ChartType.HEATMAP,
                fields={"x": c1.name, "y": c2.name, "value": n.name},
                default_aggregation="sum",
                reasoning=f"Two low-to-medium cardinality categoricals for 2D matrix view."
            ))
            rec_counter += 1

    # Trim to top 8 dynamic recommendations
    return recs[:8]

def get_unavailable_chart_reasons(profiles: List[FieldProfile]) -> List[UnavailableChartReason]:
    dates = [p for p in profiles if p.effective_type in (FieldType.DATE, FieldType.DATETIME)]
    numerics = [p for p in profiles if p.effective_type in (FieldType.INTEGER, FieldType.DECIMAL)]
    categoricals = [p for p in profiles if p.effective_type in (FieldType.CATEGORICAL, FieldType.BOOLEAN)]
    
    reasons: List[UnavailableChartReason] = []

    if not dates:
        reasons.append(UnavailableChartReason(
            chart_type=ChartType.LINE,
            title="Line / Area Chart",
            available=False,
            reason="Requires at least 1 Date/DateTime field."
        ))

    if not categoricals:
        reasons.append(UnavailableChartReason(
            chart_type=ChartType.BAR,
            title="Bar / Column Chart",
            available=False,
            reason="Requires at least 1 Categorical field."
        ))

    if not any(c.unique_count <= 10 for c in categoricals):
        reasons.append(UnavailableChartReason(
            chart_type=ChartType.PIE,
            title="Pie / Donut Chart",
            available=False,
            reason="Requires a low-cardinality Categorical field (≤10 categories)."
        ))

    if len(numerics) < 2:
        reasons.append(UnavailableChartReason(
            chart_type=ChartType.SCATTER,
            title="Scatter Plot",
            available=False,
            reason="Requires at least 2 Numeric fields."
        ))

    if len(numerics) < 3:
        reasons.append(UnavailableChartReason(
            chart_type=ChartType.CORRELATION_MATRIX,
            title="Correlation Matrix",
            available=False,
            reason="Requires at least 3 Numeric fields."
        ))

    if len(categoricals) < 2:
        reasons.append(UnavailableChartReason(
            chart_type=ChartType.HEATMAP,
            title="2D Heatmap",
            available=False,
            reason="Requires 2 Categorical fields."
        ))

    if len(numerics) < 1:
        reasons.append(UnavailableChartReason(
            chart_type=ChartType.HISTOGRAM,
            title="Histogram / Box Plot",
            available=False,
            reason="Requires at least 1 Numeric field."
        ))

    return reasons
