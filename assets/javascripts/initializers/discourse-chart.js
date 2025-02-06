import { number } from "discourse/lib/formatter";
import loadScript from "discourse/lib/load-script";
import { withPluginApi } from "discourse/lib/plugin-api";
import Site from "discourse/models/site";
import { i18n } from "discourse-i18n";

const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  layout: {
    padding: {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
  },
  animation: {
    duration: 0,
  },
  plugins: {
    legend: {
      position: "bottom",
    },
  },
};

// http://blog.adamcole.ca/2011/11/simple-javascript-rainbow-color.html
function rainbowStop(h) {
  let f = (n, k = (n + h * 12) % 12) =>
    0.5 - 0.5 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  let rgb2hex = (r, g, b) =>
    "#" +
    [r, g, b]
      .map((x) =>
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
    .map((x) =>
      x
        .split("|")
        .filter(Boolean)
        .map((i) => i.trim())
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

function computeColorsForLengthAtIndex(length) {
  return Array(length)
    .fill()
    .map((_, index) => rainbowStop((1 * index) / length)); // cross product to ensure linear progress
}

function buildChart(series, attributes) {
  if (!attributes.backgroundColors.length) {
    // series of length 2 could be labels + one serie of data
    if (series.length <= 2) {
      attributes.backgroundColors = computeColorsForLengthAtIndex(
        series[0].length
      );
    } else if (series.length > 2) {
      attributes.backgroundColors = computeColorsForLengthAtIndex(
        series.length
      );
    }
  }

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
          fill: attributes.backgroundColors.length > 0,
        };
      }),
      labels,
    },
    options: Object.assign(optionsCopy, {
      scales: {
        x: {
          title: {
            display: true,
            text: attributes.xAxisTitle,
          },
        },
        y: {
          display: true,
          ticks: {
            userCallback: (label) => {
              if (Math.floor(label) === label) {
                return number(label);
              }
            },
            callback: (label) => number(label),
          },
        },
      },
    }),
  };
}

function horizontalBarChart(series, attributes) {
  let datasets;
  if (series[0].length < 1) {
    datasets = [];
  }

  const labels = series.map((a) => a[0]);
  datasets =
    datasets ||
    [...Array(series[0].length - 1).keys()].map((idx) => {
      return {
        data: series.map((a) => a[idx + 1]),
        backgroundColor: attributes.backgroundColors[idx],
        borderColor: attributes.borderColors[idx] || "transparent",
      };
    });
  const optionsCopy = Object.assign({}, DEFAULT_CHART_OPTIONS);

  return {
    options: Object.assign(optionsCopy, {
      plugins: {
        legend: {
          display: false,
        },
      },
      indexAxis: "y",
      scales: {
        x: {
          title: {
            display: true,
            text: attributes.xAxisTitle,
          },
          min: 0,
        },
        y: {
          ticks: {
            callback: function (value) {
              const label = this.getLabelForValue(value);
              const isMobileView = Site.currentProp("mobileView");
              const maxLength = isMobileView ? 20 : 40;
              if (label) {
                return label.length > maxLength
                  ? label.substr(0, maxLength) + "…"
                  : label;
              } else {
                return value;
              }
            },
          },
        },
      },
    }),
    type: "bar",
    data: {
      labels,
      datasets,
    },
  };
}

function barChart(series, attributes) {
  const labels = series.shift();
  const optionsCopy = Object.assign({}, DEFAULT_CHART_OPTIONS);

  return {
    type: "bar",
    data: {
      datasets: series.map((serie, index) => {
        return {
          data: serie.slice(1),
          backgroundColor: attributes.backgroundColors[index],
          borderColor: attributes.borderColors[index] || "transparent",
          label: serie[0],
        };
      }),
      labels,
    },
    options: Object.assign(optionsCopy, {
      plugins: {
        legend: {
          position: "right",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: attributes.xAxisTitle,
          },
        },
        y: {
          display: true,
          ticks: {
            userCallback: (label) => {
              if (Math.floor(label) === label) {
                return number(label);
              }
            },
            callback: (label) => number(label),
          },
        },
      },
    }),
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
          backgroundColor: attributes.backgroundColors,
        },
      ],
      labels,
    },
    options: DEFAULT_CHART_OPTIONS,
  };
}

export default {
  name: "discourse-chart",

  renderCharts(charts) {
    if (!charts.length) {
      return;
    }

    loadScript("/javascripts/Chart.min.js").then(() => {
      charts.forEach((chartContainer) => this.renderChart(chartContainer));
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
      const isMobileView = Site.currentProp("mobileView");
      chart.options.maintainAspectRatio = isMobileView;

      if (attributes.title && attributes.title.length) {
        chart.options.plugins.title = {
          display: true,
          text: attributes.title,
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
      errorNode.textContent = i18n("chart.rendering_error");
      container.innerHTML = "";
      container.appendChild(errorNode);
    }
  },

  initialize() {
    withPluginApi("0.8.31", (api) => {
      api.decorateCookedElement(
        (cooked) => {
          const siteSettings = api.container.lookup("service:site-settings");
          if (siteSettings.discourse_chart_enabled) {
            const discourseCharts = cooked.querySelectorAll(".discourse-chart");
            this.renderCharts(discourseCharts);
          }
        },
        { id: "discourse-chart" }
      );
    });
  },
};
