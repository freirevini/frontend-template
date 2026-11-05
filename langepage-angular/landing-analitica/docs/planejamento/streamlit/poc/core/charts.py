"""Plotly figures on the brand tokens: Normativos Recebidos (lines), sparklines, applicability doughnut, e-mails stacked
bars and the waterfall (floating stacked bars with connectors). Equivalent of the Chart.js configurations in the
Angular project; colors come from core.tokens because SVG/canvas cannot read CSS variables."""
from __future__ import annotations

from typing import Optional

import plotly.graph_objects as go

from core.data import TrafficData, WfModel, format_currency, format_share, traffic_series
from core.period import fmt_int
from core.tokens import SEGMENT_IDS, SEGMENT_LABELS, TO_CLASSIFY_LABEL, with_alpha

FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
PLOTLY_CONFIG = {"displayModeBar": False, "responsive": True, "locale": "pt-BR"}


def _layout(t: dict, height: int, **extra) -> dict:
    base = dict(
        height=height, margin=dict(l=12, r=16, t=16, b=8), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family=FONT, size=11, color=t["chart_color"]), showlegend=False,
        hoverlabel=dict(bgcolor=t["chart_tooltip_bg"], font=dict(family=FONT, color=t["chart_tooltip_color"], size=12), bordercolor=t["chart_tooltip_bg"]),
    )
    base.update(extra)
    return base


def sparkline(t: dict, trend: list[float], labels: list[str], label: str, height: int = 70, area: bool = False) -> go.Figure:
    """White line with points on a colored card (segment cards) or a white area (Início)."""
    lo, hi = min(trend), max(trend)
    rng = (hi - lo) or 1
    fig = go.Figure(go.Scatter(
        x=labels, y=trend, mode="lines+markers" if not area else "lines", line=dict(color="rgba(255,255,255,.6)", width=1 if not area else 2, shape="spline", smoothing=1.0),
        marker=dict(size=8, color="#ffffff"), fill="tozeroy" if area else None, fillcolor="rgba(255,255,255,.12)",
        hovertemplate=f"{label}<br>%{{x}}: %{{y}}<extra></extra>",
    ))
    fig.update_layout(**_layout(t, height, margin=dict(l=0, r=0, t=4, b=4)))
    fig.update_xaxes(visible=False, fixedrange=True)
    fig.update_yaxes(visible=False, fixedrange=True, range=[lo - rng * 0.3, hi + rng * 0.15] if not area else [lo - rng * 0.8, hi + rng * 0.1])
    return fig


def traffic_chart(t: dict, data: TrafficData, highlighted: Optional[int], focus: Optional[str], surface: str) -> go.Figure:
    """Four segment lines plus the dashed 'Normas a Classificar' reference, with value labels above the points."""
    series = traffic_series(data, focus if highlighted is None or highlighted == 4 else SEGMENT_IDS[highlighted])
    colors = t["series"] + [t["series_reference"]]
    ids = SEGMENT_IDS + ["to-classify"]
    fig = go.Figure()
    for index, sid in enumerate(ids):
        color = colors[index]
        active = highlighted == index
        dimmed = highlighted is not None and not active and not (index == 4 and highlighted < 4)
        label = TO_CLASSIFY_LABEL if sid == "to-classify" else SEGMENT_LABELS[sid]
        values = series[sid]
        fig.add_trace(go.Scatter(
            x=data.labels, y=values, name=label,
            mode="lines" if dimmed else "lines+markers+text",
            text=[fmt_int(v) for v in values], textposition="top center",
            textfont=dict(family=FONT, size=11, color=t["chart_color"], weight=600),
            line=dict(color=with_alpha(color, 0.2) if dimmed else color, width=3 if active else 2, dash="dash" if sid == "to-classify" else "solid", shape="spline", smoothing=0.8),
            marker=dict(size=7, color=color, line=dict(color=surface, width=2)),
            fill="tozeroy" if active else None, fillcolor=with_alpha(color, 0.1),
            hovertemplate=f"{label}: %{{y}}<extra></extra>",
        ))
    fig.update_layout(**_layout(t, 300, hovermode="x unified", margin=dict(l=12, r=16, t=24, b=28)))
    fig.update_xaxes(showgrid=False, zeroline=False, showline=False, tickfont=dict(size=11, color=t["chart_color"]), fixedrange=True)
    fig.update_yaxes(range=[0, 250], showgrid=True, gridcolor=t["chart_grid"], zeroline=False, showticklabels=False, showline=False, nticks=5, fixedrange=True)
    return fig


def doughnut(t: dict, applicable: int, not_applicable: int, picked: Optional[bool], surface: str) -> go.Figure:
    fills = [t["applicable"], t["not_applicable"]]
    if picked is not None:
        fills = [c if (picked == (i == 0)) else with_alpha(c, 0.16) for i, c in enumerate(fills)]
    pull = [0.06 if picked is not None and picked == (i == 0) else 0 for i in range(2)]
    total = applicable + not_applicable
    fig = go.Figure(go.Pie(
        labels=["Aplicáveis", "Não aplicáveis"], values=[applicable, not_applicable], hole=0.62, sort=False, direction="clockwise",
        marker=dict(colors=fills, line=dict(color=surface, width=2)), textinfo="none", pull=pull,
        hovertemplate="%{label}: %{value} (%{percent})<extra></extra>",
    ))
    fig.update_layout(**_layout(t, 220, margin=dict(l=10, r=10, t=10, b=10)))
    fig.add_annotation(text=f"<b>{fmt_int(total)}</b><br><span style='font-size:13px;color:{t['content_low']}'>{'classificada' if total == 1 else 'classificadas'}</span>",
                       x=0.5, y=0.5, showarrow=False, font=dict(family=FONT, size=28, color=t["content_high"]))
    return fig


def emails_chart(t: dict, buckets, positions: list[int], highlighted: Optional[int], surface: str) -> go.Figure:
    fig = go.Figure()
    labels = [b.label for b in buckets]
    for position in positions:
        color = t["series"][position]
        fill = with_alpha(color, 0.28) if (highlighted is not None and highlighted != position) else color
        fig.add_trace(go.Bar(
            x=labels, y=[b.normas[position] for b in buckets], name=SEGMENT_LABELS[SEGMENT_IDS[position]],
            marker=dict(color=fill, line=dict(color=surface, width=1)),
            hovertemplate="%{fullData.name}: %{y} normas<extra></extra>",
        ))
    peak = max([1] + [b.total for b in buckets])
    fig.update_layout(**_layout(t, 300, barmode="stack", bargap=0.3, hovermode="x unified", margin=dict(l=12, r=16, t=16, b=28)))
    fig.update_xaxes(showgrid=False, zeroline=False, tickfont=dict(size=11, color=t["chart_color"]), fixedrange=True)
    fig.update_yaxes(range=[0, peak * 1.18], showgrid=True, gridcolor=t["chart_grid"], zeroline=False, showticklabels=False, fixedrange=True)
    for b in buckets:
        if b.total:
            fig.add_annotation(x=b.label, y=b.total, text=f"<b>{fmt_int(b.total)}</b>", showarrow=False, yshift=10,
                               font=dict(family=FONT, size=12, color=t["content_high"]))
    return fig


def waterfall_chart(t: dict, model: WfModel, unit: str, unit_scale: float, surface: str) -> go.Figure:
    """Stacked floating bars per step (parts in ordinal ramps), connectors between running levels, labels inside."""
    labels = [c.step["label"] for c in model.columns]
    fig = go.Figure()
    for seg in model.segments:
        ramp = t["wf_total"] if seg.kind == "total" else t["wf_decrease"]
        color = ramp[min(seg.part_index, len(ramp) - 1)]
        signed = -seg.value if seg.kind == "decrease" else seg.value
        value_text = format_share(signed, model.base) if unit == "percent" else format_currency(signed, unit_scale)
        other = format_currency(signed, unit_scale) if unit == "percent" else f"{format_share(signed, model.base)} da receita bruta"
        column = model.columns[seg.step_index]
        after = format_share(column.end, model.base) if unit == "percent" else format_currency(column.end, unit_scale)
        fig.add_trace(go.Bar(
            x=[labels[seg.step_index]], y=[seg.high - seg.low], base=[seg.low], width=0.6,
            marker=dict(color=color, line=dict(color=surface, width=1)),
            text=f"<b>{value_text}</b><br>{seg.part_label}", textposition="inside", insidetextanchor="middle",
            textfont=dict(family=FONT, size=11, color="#ffffff" if seg.part_index < 2 else "#0b0b0b"),
            hovertemplate=f"<b>{value_text}</b><br>{seg.part_label} · {seg.step_label}<br>{other}<br>Saldo após {seg.step_label}: {after}<extra></extra>",
        ))
    for index in range(len(model.columns) - 1):
        y = model.columns[index].end
        fig.add_shape(type="line", x0=index + 0.3, x1=index + 0.7, y0=y, y1=y, line=dict(color=t["wf_connector"], width=1))
    top = model.base if unit == "percent" else model.base * 1.08
    fig.update_layout(**_layout(t, 320, barmode="overlay", bargap=0.4, uniformtext=dict(mode="hide", minsize=9), margin=dict(l=12, r=16, t=16, b=28)))
    fig.update_xaxes(showgrid=False, zeroline=False, tickfont=dict(size=11, color=t["chart_color"]), fixedrange=True)
    fig.update_yaxes(range=[0, top], showgrid=True, gridcolor=t["chart_grid"], zeroline=False, showticklabels=False, fixedrange=True)
    return fig
