import { number } from "discourse/lib/formatter";
import loadScript from "discourse/lib/load-script";
import { withPluginApi } from "discourse/lib/plugin-api";

const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  layout: {
    padding: {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    }
  },
  legend: {
    position: "bottom"
  },
  animation: {
    duration: 0
  }
};

function cleanMarkup(markup) {
  return markup
    .split("\n")
    .map(x =>
      x
        .split("|")
        .filter(Boolean)
        .map(i => i.trim())
    )
    .filter(Boolean);
}

function extractAttributes(container) {
  const attributes = {};

  attributes["borderColors"] = (
    container.getAttribute("data-border-colors") || ""
  )
    .split(",")
    .filter(Boolean);

  attributes["backgroundColors"] = (
    container.getAttribute("data-background-colors") || ""
  )
    .split(",")
    .filter(Boolean);

  attributes["labels"] = (container.getAttribute("data-labels") || "")
    .split(",")
    .filter(Boolean);

  attributes["title"] = container.getAttribute("data-title");
  attributes["type"] = container.getAttribute("data-type");
  attributes["xAxisTitle"] = container.getAttribute("data-x-axis-title");

  return attributes;
}

function buildChart(series, attributes) {
  switch (attributes.type) {
    case "doughnut":
    case "pie":
      return circularChart(series, attributes);
    case "line":
      return lineChart(series, attributes);
    case "bar":
      return barChart(series, attributes);
    case "horizontalBar":
      return horizontalBarChart(series, attributes);
  }
}

function lineChart(series, attributes) {
  const labels = series.shift();

  return {
    type: attributes.type,
    data: {
      datasets: series.map((serie, index) => {
        return {
          data: serie.slice(1),
          backgroundColor:
            attributes.backgroundColors.length > 0
              ? attributes.backgroundColors[index]
              : attributes.borderColors[index],
          borderColor: attributes.borderColors[index],
          label: serie[0],
          fill: attributes.backgroundColors.length > 0
        };
      }),
      labels
    },
    options: Object.assign(_.clone(DEFAULT_CHART_OPTIONS), {
      scales: {
        yAxes: [
          {
            display: true,
            ticks: {
              userCallback: label => {
                if (Math.floor(label) === label) return number(label);
              },
              callback: label => number(label)
            }
          }
        ]
      }
    })
  };
}

function horizontalBarChart(series, attributes) {
  const labels = series.map(a => a[0]);
  const datasets = [...Array(series[0].length - 1).keys()].map(idx => {
    return {
      data: series.map(a => a[idx + 1]),
      backgroundColor: attributes.backgroundColors[idx],
      borderColor: attributes.borderColors[idx] || "transparent"
    };
  });

  return {
    options: Object.assign(_.clone(DEFAULT_CHART_OPTIONS), {
      legend: {
        display: false
      },
      scales: {
        xAxes: [
          {
            ticks: { min: 0 }
          }
        ],
        yAxes: [
          {
            ticks: {
              callback: function(value) {
                const isMobileView = Discourse.Site.currentProp("mobileView");
                if (
                  isMobileView &&
                  typeof value === "string" &&
                  value.length > 20
                ) {
                  return value.substr(0, 17) + "…";
                } else {
                  return value;
                }
              }
            }
          }
        ]
      }
    }),
    type: attributes.type,
    data: {
      labels,
      datasets
    }
  };
}

function barChart(series, attributes) {
  const labels = series.shift();
  const horiz = attributes.type === "horizontalBar";

  return {
    type: attributes.type,
    data: {
      datasets: series.map((serie, index) => {
        return {
          data: serie.slice(1),
          backgroundColor: attributes.backgroundColors[index],
          borderColor: attributes.borderColors[index] || "transparent",
          label: serie[0]
        };
      }),
      labels
    },
    options: Object.assign(_.clone(DEFAULT_CHART_OPTIONS), {
      legend: {
        position: horiz ? "right" : "bottom"
      },
      scales: {
        yAxes: [
          {
            display: true,
            ticks: {
              userCallback: label => {
                if (Math.floor(label) === label) return number(label);
              },
              callback: label => number(label)
            }
          }
        ]
      }
    })
  };
}

function circularChart(series, attributes) {
  const labels = series.shift();

  return {
    type: attributes.type,
    data: {
      datasets: [
        {
          label: "serie 1",
          data: series.shift(),
          backgroundColor: attributes.backgroundColors
        }
      ],
      labels
    },
    options: DEFAULT_CHART_OPTIONS
  };
}

export default {
  name: "discourse-chart",

  renderCharts(charts) {
    loadScript("/javascripts/Chart.min.js").then(() =>
      charts.forEach(chart => this.renderChart(chart))
    );
  },

  renderChart(container) {
    const attributes = extractAttributes(container);
    const data = cleanMarkup(container.textContent);
    container.innerHTML = "";

    const spinner = document.createElement("div");
    spinner.classList.add("spinner");
    spinner.classList.add("tiny");
    container.appendChild(spinner);
    container.classList.remove("is-building");

    try {
      const chart = buildChart(data, attributes);

      const isMobileView = Discourse.Site.currentProp("mobileView");
      chart.options.maintainAspectRatio = !isMobileView;

      if (attributes.title && attributes.title.length) {
        chart.options.title = {
          display: true,
          text: attributes.title
        };
      }

      if (attributes.xAxisTitle && attributes.xAxisTitle.length) {
        chart.options.scales = chart.options.scales || {};
        chart.options.scales.xAxes = chart.options.scales.xAxes || [{}];
        const xAxes = chart.options.scales.xAxes[0];
        xAxes.display = true;
        xAxes.scaleLabel = {
          display: attributes.xAxisTitle.length,
          labelString: attributes.xAxisTitle
        };
      }

      const canvas = document.createElement("canvas");
      new Chart(canvas, chart);
      container.innerHTML = "";
      container.appendChild(canvas);
      container.classList.remove("is-loading");
    } catch (e) {
      console.log(e);
      const errorNode = document.createElement("div");
      errorNode.classList.add("discourse-chart-error");
      errorNode.textContent = I18n.t("discourse_chart.rendering_error");
      container.innerHTML = "";
      container.appendChild(errorNode);
    }
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
            this.renderCharts(discourseCharts);
          }
        },
        { id: "discourse-chart" }
      );
    });
  }
};
