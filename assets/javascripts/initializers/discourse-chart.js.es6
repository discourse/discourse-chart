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

// http://blog.adamcole.ca/2011/11/simple-javascript-rainbow-color.html
function rainbowStop(h) {
  let f = (n, k = (n + h * 12) % 12) =>
    0.5 - 0.5 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  let rgb2hex = (r, g, b) =>
    "#" +
    [r, g, b]
      .map(x =>
        Math.round(x * 255)
          .toString(16)
          .padStart(2, 0)
      )
      .join("");
  return rgb2hex(f(0), f(8), f(4));
}

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
  attributes.backgroundColors =
    attributes.backgroundColors && attributes.backgroundColors.length
      ? attributes.backgroundColors
      : Array(series[0].length)
          .fill()
          .map(() => rainbowStop(Math.random()));

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
  const optionsCopy = Object.assign({}, DEFAULT_CHART_OPTIONS);

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
    options: Object.assign(optionsCopy, {
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
  const optionsCopy = Object.assign({}, DEFAULT_CHART_OPTIONS);

  return {
    options: Object.assign(optionsCopy, {
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
                const maxLength = isMobileView ? 20 : 40;

                if (typeof value === "string" && value.length > maxLength) {
                  return value.substr(0, maxLength) + "…";
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
  const optionsCopy = Object.assign({}, DEFAULT_CHART_OPTIONS);

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
    options: Object.assign(optionsCopy, {
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
    if (!charts.length) return;

    loadScript("/javascripts/Chart.min.js").then(() => {
      // makes linear charts start at 0
      window.Chart.scaleService.updateScaleDefaults("linear", {
        ticks: {
          min: 0
        }
      });

      charts.forEach(this.renderChart);
    });
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
      // eslint-disable-next-line
      new window.Chart(canvas, chart);
      container.innerHTML = "";
      container.appendChild(canvas);
      container.classList.remove("is-loading");
    } catch (e) {
      // eslint-disable-next-line
      console.log(e);
      const errorNode = document.createElement("div");
      errorNode.classList.add("discourse-chart-error");
      errorNode.textContent = I18n.t("chart.rendering_error");
      container.innerHTML = "";
      container.appendChild(errorNode);
    }
  },

  initialize() {
    withPluginApi("0.8.31", api => {
      api.decorateCookedElement(
        cooked => {
          if (Discourse.SiteSettings.discourse_chart_enabled) {
            const discourseCharts = cooked.querySelectorAll(".discourse-chart");
            this.renderCharts(discourseCharts);
          }
        },
        { id: "discourse-chart" }
      );
    });
  }
};
