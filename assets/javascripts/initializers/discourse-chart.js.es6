import { number } from "discourse/lib/formatter";
import loadScript from "discourse/lib/load-script";
import { withPluginApi } from "discourse/lib/plugin-api";
const { run } = Ember;

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
        .filter(x => x)
        .map(x => x.trim())
    )
    .filter(x => x);
}

function extractAttributes(container) {
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

  attributes["labels"] = (container.getAttribute("data-labels") || "")
    .split(",")
    .filter(x => x);

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

function barChart(series, attributes) {
  const labels = series.shift();

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
    charts.forEach(chart => this.renderChart(chart));
  },

  renderChart(container) {
    const spinner = document.createElement("div");
    spinner.class = "spinner tiny";
    container.appendChild(spinner);

    loadScript("/javascripts/Chart.min.js").then(() => {
      container.classList.remove("is-loading");

      try {
        const attributes = extractAttributes(container);
        const data = cleanMarkup(container.textContent);

        const canvas = document.createElement("canvas");
        container.innerHTML = "";
        container.appendChild(canvas);

        new Chart(canvas, buildChart(data, attributes));
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
            run.debounce(this, this.renderCharts, discourseCharts, 250);
          }
        },
        { id: "discourse-chart" }
      );
    });
  }
};
