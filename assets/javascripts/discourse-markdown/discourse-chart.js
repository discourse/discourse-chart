const SUPPORTED_CHART_TYPES = [
  "line",
  "bar",
  "pie",
  "doughnut",
  "horizontalBar",
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

  helper.allowList([
    "div.discourse-chart",
    "div[class=discourse-chart is-building is-loading]",
    "div[data-type]",
    "div[data-labels]",
    "div[data-title]",
    "div[data-x-axis-title]",
    "div[data-y-axis-title]",
    "div[data-border-colors]",
    "div[data-background-colors]",
  ]);

  helper.registerPlugin((md) => {
    md.block.bbcode.ruler.push("discourse-chart", {
      tag: "chart",

      replace(state, tagInfo, content) {
        const token = state.push("discourse_chart", "div", 0);
        token.block = true;
        token.content = content.split("\n").filter(Boolean).join("\n");

        const attributes = processAttributes(
          tagInfo.attrs,
          state.md.utils.escapeHtml
        );
        token.attrs = Object.entries(attributes).map(([name, value]) => [
          `data-${name}`,
          value,
        ]);

        return true;
      },
    });

    // a single token keeps the chart data out of the token stream as text, so
    // the rich editor can hold it as an attribute of one leaf node
    md.renderer.rules.discourse_chart = (tokens, idx) => {
      const token = tokens[idx];
      const attributes = token.attrs
        .map(([name, value]) => `${name}="${value}"`)
        .join(" ");

      return `<div class="discourse-chart is-building is-loading" ${attributes}>${md.utils.escapeHtml(
        token.content
      )}</div>\n`;
    };
  });
}
