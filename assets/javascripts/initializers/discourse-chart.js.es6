import loadScript from "discourse/lib/load-script";
import { withPluginApi } from "discourse/lib/plugin-api";
const { run } = Ember;

function handleRawChart(markup, container, options) {
  const rows = markup
    .split("\n")
    .map(x =>
      x
        .split("|")
        .filter(x => x)
        .map(x => x.trim())
    )
    .filter(x => x);

  const header = rows.shift();

  return {
    labels: rows.map(row => row[0]),
    datasets: header.slice(1).map((label, index) => {
      const dataset = { label, data: rows.map(row => row.slice(1)[index]) };

      if (options.borderColors.length) {
        dataset.borderColor = options.borderColors.shift();
      }

      if (options.backgroundColors.length) {
        dataset.backgroundColor = options.backgroundColors.shift();
      }

      return dataset;
    })
  };
}

function extractChartAttributes(container) {
  const attributes = {};

  attributes["borderColors"] = (
    container.getAttribute("data-border-colors") || ""
  )
    .split(",")
    .filter(x => x);

  attributes["backgroundColors"] = (
    container.getAttribute("data-background-colors") || ""
  )
    .split(",")
    .filter(x => x);

  attributes["title"] = container.getAttribute("data-title");
  attributes["type"] = container.getAttribute("data-type");
  attributes["xAxisTitle"] = container.getAttribute("data-x-axis-title");

  return attributes;
}

function buildChartOptions(container, chartAttributes) {
  const chartOptions = {
    responsive: true,
    hoverMode: "index",
    stacked: false,
    animation: {
      duration: 0
    },
    scales: {
      xAxes: []
    }
  };

  if (chartAttributes.title && chartAttributes.title.length) {
    chartOptions.title = {
      display: true,
      text: chartAttributes.title
    };
  }

  if (chartAttributes.xAxisTitle && chartAttributes.xAxisTitle.length) {
    chartOptions.scales.xAxes.push({
      display: true,
      scaleLabel: {
        display: chartAttributes.xAxisTitle.length,
        labelString: chartAttributes.xAxisTitle
      }
    });
  }

  return chartOptions;
}

export default {
  name: "discourse-chart",

  renderChart(container) {
    const chartMarkup = container.textContent;
    const chartAttributes = extractChartAttributes(container);

    const spinner = document.createElement("div");
    spinner.class = "spinner tiny";
    container.appendChild(spinner);

    loadScript("/javascripts/Chart.min.js").then(() => {
      container.classList.remove("is-loading");

      try {
        const canvas = document.createElement("canvas");
        container.innerHTML = "";
        container.appendChild(canvas);

        new Chart(canvas, {
          type: chartAttributes.type || "line",
          data: handleRawChart(chartMarkup, container, chartAttributes),
          options: buildChartOptions(container, chartAttributes)
        });
      } catch (e) {
        console.log(e);
        const errorNode = document.createElement("div");
        errorNode.classList.add("discourse-chart-error");
        errorNode.textContent = I18n.t("discourse_chart.rendering_error");
        container.innerHTML = "";
        container.appendChild(errorNode);
      }
    });
  },

  initialize() {
    withPluginApi("0.8.31", api => {
      api.decorateCooked(
        $elem => {
          const discourseCharts = $elem[0].querySelectorAll(".discourse-chart");
          if (
            discourseCharts.length &&
            Discourse.SiteSettings.discourse_chart_enabled
          ) {
            discourseCharts.forEach(discourseChart =>
              run.debounce(this, this.renderChart, discourseChart, 200)
            );
          }
        },
        { id: "discourse-chart" }
      );
    });
  }
};
