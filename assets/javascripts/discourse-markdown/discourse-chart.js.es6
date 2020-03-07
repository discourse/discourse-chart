const SUPPORTED_CHART_TYPES = [
  "line",
  "bar",
  "pie",
  "doughnut",
  "horizontalBar"
];

function processAttributes(attrs, escapeHtml) {
  const attributes = {};

  const inputType = attrs.type;

  if (inputType && SUPPORTED_CHART_TYPES.includes(inputType)) {
    attributes["type"] = escapeHtml(inputType);
  } else {
    attributes["type"] = SUPPORTED_CHART_TYPES[0];
  }

  if (attrs["borderColors"]) {
    attributes["border-colors"] = escapeHtml(attrs["borderColors"]);
  }

  if (attrs["backgroundColors"]) {
    attributes["background-colors"] = escapeHtml(attrs["backgroundColors"]);
  }

  if (attrs["xAxisTitle"]) {
    attributes["x-axis-title"] = escapeHtml(attrs["xAxisTitle"]);
  }

  if (attrs["yAxisTitle"]) {
    attributes["y-axis-title"] = escapeHtml(attrs["yAxisTitle"]);
  }

  if (attrs["title"]) {
    attributes["title"] = escapeHtml(attrs["title"]);
  }

  if (attrs["labels"]) {
    attributes["labels"] = escapeHtml(attrs["labels"]);
  }

  return attributes;
}

export function setup(helper) {
  if (!helper.markdownIt) {
    return;
  }

  helper.registerOptions((opts, siteSettings) => {
    opts.features.discourse_chart = siteSettings.discourse_chart_enabled;
  });

  helper.whiteList([
    "div.discourse-chart",
    "div.discourse-chart.is-loading",
    "div.discourse-chart.is-building"
  ]);

  helper.registerPlugin(md => {
    md.inline.bbcode.ruler.push("discourse-chart", {
      tag: "chart",

      replace(state, tagInfo, content) {
        const token = state.push("html_raw", "", 0);

        content = content
          .split("\n")
          .filter(x => x)
          .map(x => state.md.utils.escapeHtml(x))
          .join("\n");

        const attributes = processAttributes(
          tagInfo.attrs,
          state.md.utils.escapeHtml
        );

        const formattedAttributes = [];
        Object.keys(attributes).forEach(attribute => {
          const value = attributes[attribute];
          formattedAttributes.push(`data-${attribute}="${value}"`);
        });

        token.content = `<div class="discourse-chart is-building is-loading" ${formattedAttributes.join(
          " "
        )}>${content}</div>\n`;

        return true;
      }
    });
  });
}
