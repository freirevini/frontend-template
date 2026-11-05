import {
  buildTrafficPeriod,
  DashboardChartsData,
  DEFAULT_TRAFFIC_RANGE,
  segmentIndex,
  TO_CLASSIFY_INDEX,
  TRAFFIC_RANGES,
  TRAFFIC_SERIES,
  trafficPeriod,
  validateCustomRange
} from './dashboard-charts-data';

describe('DashboardChartsData (Tráfego)', () => {
  let chartsData: DashboardChartsData;

  beforeEach(() => {
    chartsData = new DashboardChartsData();
  });

  it('builds labels and subtitle for each range', () => {
    expect(trafficPeriod('Day', 7).labels).toEqual(['Sáb 25/12', 'Dom 26/12', 'Seg 27/12', 'Ter 28/12', 'Qua 29/12', 'Qui 30/12', 'Sex 31/12']);
    expect(trafficPeriod('Day', 7).subtitle).toBe('25 a 31 de dezembro de 2021');
    expect(trafficPeriod('Day', 30).subtitle).toBe('2 a 31 de dezembro de 2021');
    expect(trafficPeriod('Day', 30).labels.length).toBe(30);
    expect(trafficPeriod('Month', 12).subtitle).toBe('Janeiro a dezembro de 2021');
    expect(trafficPeriod('Month', 3).labels).toEqual(['Outubro', 'Novembro', 'Dezembro']);
    expect(trafficPeriod('Month', 3).subtitle).toBe('Outubro a dezembro de 2021');
    expect(trafficPeriod('Year', 5).labels).toEqual(['2017', '2018', '2019', '2020', '2021']);
    expect(trafficPeriod('Year', 3).subtitle).toBe('2019 a 2021');
  });

  it('crosses a month boundary in the day subtitle', () => {
    expect(trafficPeriod('Day', 40).subtitle).toBe('22 de novembro a 31 de dezembro de 2021');
  });

  it('uses the default range per granularity and accepts only listed ranges', () => {
    chartsData.initMainChart('Day');
    expect(chartsData.currentRange).toBe(DEFAULT_TRAFFIC_RANGE.Day);
    chartsData.initMainChart('Day', 30);
    expect(chartsData.currentRange).toBe(30);
    expect(chartsData.mainChart.data.labels.length).toBe(30);
    chartsData.initMainChart('Year', 30);
    expect(chartsData.currentRange).toBe(DEFAULT_TRAFFIC_RANGE.Year);
    expect(TRAFFIC_RANGES.Month.map((option) => option.label)).toEqual(['3 meses', '6 meses', '12 meses']);
  });

  describe('custom date range', () => {
    const range = (start: [number, number, number], end: [number, number, number]) => ({
      start: new Date(start[0], start[1] - 1, start[2]),
      end: new Date(end[0], end[1] - 1, end[2])
    });

    it('builds one label per day, month or year in the range', () => {
      expect(buildTrafficPeriod('Day', range([2021, 11, 20], [2021, 12, 10])).labels.length).toBe(21);
      expect(buildTrafficPeriod('Day', range([2021, 11, 20], [2021, 12, 10])).subtitle).toBe('20 de novembro a 10 de dezembro de 2021');
      expect(buildTrafficPeriod('Day', range([2020, 12, 30], [2021, 1, 2])).subtitle).toBe('30 de dezembro de 2020 a 2 de janeiro de 2021');
      expect(buildTrafficPeriod('Month', range([2021, 3, 15], [2021, 5, 2])).labels).toEqual(['Março', 'Abril', 'Maio']);
      const multiYear = buildTrafficPeriod('Month', range([2020, 11, 1], [2021, 2, 1]));
      expect(multiYear.labels).toEqual(['Nov/20', 'Dez/20', 'Jan/21', 'Fev/21']);
      expect(multiYear.subtitle).toBe('Novembro de 2020 a fevereiro de 2021');
      expect(buildTrafficPeriod('Year', range([2015, 6, 1], [2021, 1, 1])).subtitle).toBe('2015 a 2021');
    });

    it('rejects missing dates, inverted dates and ranges too long for the granularity', () => {
      expect(validateCustomRange('Day', {})).toBe('Informe as duas datas.');
      expect(validateCustomRange('Day', range([2021, 5, 2], [2021, 5, 1]))).toContain('anterior ou igual');
      expect(validateCustomRange('Day', range([2021, 1, 1], [2021, 12, 31]))).toContain('até 92 dias');
      expect(validateCustomRange('Month', range([2010, 1, 1], [2021, 12, 31]))).toContain('até 60 meses');
      expect(validateCustomRange('Month', range([2021, 1, 1], [2021, 12, 31]))).toBeNull();
    });

    it('plots a valid custom range and falls back to the default preset otherwise', () => {
      chartsData.initMainChart('Day', undefined, range([2021, 11, 20], [2021, 12, 10]));
      expect(chartsData.currentRange).toBeNull();
      expect(chartsData.mainChart.data.labels.length).toBe(21);
      expect(chartsData.mainChart.data.datasets.every((dataset: { data: number[] }) => dataset.data.length === 21)).toBeTrue();

      chartsData.initMainChart('Day', undefined, range([2019, 1, 1], [2021, 12, 31]));
      expect(chartsData.currentRange).toBe(DEFAULT_TRAFFIC_RANGE.Day);
    });
  });

  it('plots the four segments alphabetically plus the dashed "Normas a Classificar" line', () => {
    const datasets = chartsData.mainChart.data.datasets;
    expect(datasets.map((dataset: { label: string }) => dataset.label))
      .toEqual(['Atacado', 'Corporativo', 'Plataforma', 'Varejo', 'Normas a Classificar']);
    expect(datasets[4].borderDash.length).toBeGreaterThan(0);
    expect(datasets.slice(0, 4).every((dataset: { borderDash: number[] }) => dataset.borderDash.length === 0)).toBeTrue();
  });

  ['Day', 'Month', 'Year'].forEach((period) => {
    it(`generates one value per label for ${period}`, () => {
      chartsData.initMainChart(period);
      const { labels, datasets } = chartsData.mainChart.data;
      datasets.forEach((dataset: { data: number[] }) => expect(dataset.data.length).toBe(labels.length));
      const key = period as 'Day' | 'Month' | 'Year';
      expect(chartsData.mainChart['subtitle']).toBe(trafficPeriod(key, DEFAULT_TRAFFIC_RANGE[key]).subtitle);
    });
  });

  it('styles points with a 2px ring in the card color, gridlines only on y and 11px x ticks', () => {
    const { datasets } = chartsData.mainChart.data;
    datasets.forEach((dataset: any) => {
      expect(dataset.pointRadius).toBe(3);
      expect(dataset.pointHoverRadius).toBe(5);
      expect(dataset.pointBorderWidth).toBe(2);
      expect(typeof dataset.pointBorderColor).toBe('function');
      expect(dataset.pointBorderColor({ chart: { canvas: null } })).toMatch(/^(#|rgb)/);
    });
    const scales = chartsData.mainChart.options.scales;
    expect(scales.x.grid.display).toBeFalse();
    expect(scales.x.ticks.font.size).toBe(11);
    expect(scales.y.grid.drawTicks).toBeFalse();
    expect(chartsData.mainChart.options.elements.point.hoverRadius).toBe(5);
    expect(datasets[0].borderWidth).toBe(2);
  });

  it('hides the y axis numbers and labels every series', () => {
    expect(chartsData.mainChart.options.scales.y.ticks.display).toBeFalse();
    const placements = chartsData.mainChart.data.datasets.map((dataset: { valueLabel?: string }) => dataset.valueLabel);
    expect(placements).toEqual(['point', 'point', 'point', 'point', 'point']);
  });

  it('highlights one segment and dims the other segments without changing their data', () => {
    const before = chartsData.mainChart.data.datasets.slice(0, TO_CLASSIFY_INDEX).map((dataset: { data: number[] }) => dataset.data);
    chartsData.renderMainChart(1);
    const datasets = chartsData.mainChart.data.datasets;
    expect(datasets.slice(0, TO_CLASSIFY_INDEX).map((dataset: { data: number[] }) => dataset.data)).toEqual(before);
    expect(datasets[1].valueLabel).toBe('point');
    expect(datasets[1].borderWidth).toBe(3);
    expect(datasets[0].valueLabel).toBeUndefined();
    expect(datasets[0].pointRadius).toBe(0);

    chartsData.renderMainChart(null);
    expect(chartsData.mainChart.data.datasets.every((dataset: { valueLabel?: string }) => dataset.valueLabel === 'point')).toBeTrue();
  });

  it('keeps "Normas a Classificar" active and filters it to the selected segment', () => {
    const totalLine: number[] = chartsData.mainChart.data.datasets[TO_CLASSIFY_INDEX].data;
    const perSegment = [0, 1, 2, 3].map((segment) => {
      chartsData.renderMainChart(segment);
      const line = chartsData.mainChart.data.datasets[TO_CLASSIFY_INDEX];
      expect(line.valueLabel).toBe('point');
      expect(line.pointRadius).toBe(3);
      expect(line.label).toBe(`Normas a Classificar · ${TRAFFIC_SERIES[segment].label}`);
      expect(chartsData.trafficSummary()[TO_CLASSIFY_INDEX].filter).toBe(TRAFFIC_SERIES[segment].label);
      return line.data as number[];
    });
    // Unfiltered line = sum of the four segments' normas a classificar, point by point.
    totalLine.forEach((value, point) => expect(value).toBe(perSegment.reduce((sum, line) => sum + line[point], 0)));

    chartsData.renderMainChart(TO_CLASSIFY_INDEX);
    expect(chartsData.mainChart.data.datasets[TO_CLASSIFY_INDEX].data).toEqual(totalLine);
    expect(chartsData.mainChart.data.datasets[0].valueLabel).toBeUndefined();
    expect(chartsData.trafficSummary()[TO_CLASSIFY_INDEX].filter).toBeUndefined();
  });

  it('summarizes totals and shares for the legend', () => {
    const summary = chartsData.trafficSummary();
    expect(summary.map((item) => item.label)).toEqual(TRAFFIC_SERIES.map((series) => series.label));
    const values = chartsData.mainChart.data.datasets[0].data as number[];
    expect(summary[0].total).toBe(values.reduce((sum, value) => sum + value, 0));
    const shares = summary.reduce((sum, item) => sum + item.share, 0);
    expect(shares).toBeCloseTo(1, 5);
    expect(summary[TO_CLASSIFY_INDEX].label).toBe('Normas a Classificar');
    expect(summary[4].dashed).toBeTrue();
  });

  describe('page filter (segment cards "a classificar")', () => {
    it('maps segment ids to series indexes', () => {
      expect(segmentIndex('atacado')).toBe(0);
      expect(segmentIndex('varejo')).toBe(3);
      expect(segmentIndex('to-classify')).toBeNull();
      expect(segmentIndex(null)).toBeNull();
    });

    it('filters only the "Normas a Classificar" line to the focused segment', () => {
      const segmentLines = chartsData.mainChart.data.datasets.slice(0, TO_CLASSIFY_INDEX).map((d: { data: number[] }) => d.data);
      chartsData.renderMainChart(TO_CLASSIFY_INDEX, 1);
      const datasets = chartsData.mainChart.data.datasets;
      expect(datasets[TO_CLASSIFY_INDEX].label).toBe('Normas a Classificar · Corporativo');
      expect(datasets[TO_CLASSIFY_INDEX].valueLabel).toBe('point');
      expect(datasets[1].valueLabel).toBeUndefined();
      expect(datasets.slice(0, TO_CLASSIFY_INDEX).map((d: { data: number[] }) => d.data)).toEqual(segmentLines);
      expect(chartsData.trafficSummary()[TO_CLASSIFY_INDEX].filter).toBe('Corporativo');

      chartsData.renderMainChart(null, null);
      expect(chartsData.mainChart.data.datasets[TO_CLASSIFY_INDEX].label).toBe('Normas a Classificar');
    });

    it('lets a highlighted segment win over the page focus', () => {
      chartsData.renderMainChart(0, 3);
      expect(chartsData.mainChart.data.datasets[TO_CLASSIFY_INDEX].label).toBe('Normas a Classificar · Atacado');
    });
  });
});
