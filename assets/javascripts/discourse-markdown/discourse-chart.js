import { camelCaseToDash } from "discourse/lib/case-converter";

const SUPPORTED_CHART_TYPES = [
  "line",
  "bar",
  "pie",
  "doughnut",
  "horizontalBar",
];

const ATTRIBUTES = [
  "borderColors",
  "backgroundColors",
  "xAxisTitle",
  "yAxisTitle",
  "title",
  "labels",
];

// values stay as authored; the renderer escapes, so the token keeps the original
function processAttributes({ type, ...attrs }) {
  const attributes = {
    type: SUPPORTED_CHART_TYPES.includes(type)
      ? type
      : SUPPORTED_CHART_TYPES[0],
  };

  for (const name of ATTRIBUTES) {
    if (attrs[name]) {
      attributes[name] = attrs[name];
    }
  }

  return attributes;
}

export function setup(helper) {
  if (!helper.markdownIt) {
    return;
  }

  helper.registerOptions((opts, siteSettings) => {
    opts.features["discourse-chart"] = siteSettings.discourse_chart_enabled;
  });

  helper.allowList([
    "div.discourse-chart",
    "div[class=discourse-chart is-building is-loading]",
  ]);

  helper.registerPlugin((md) => {
    md.block.bbcode.ruler.push("discourse-chart", {
      tag: "chart",

      replace(state, tagInfo, content) {
        const token = state.push("discourse_chart", "div", 0);
        token.content = content.split("\n").filter(Boolean).join("\n");

        token.attrs = Object.entries(processAttributes(tagInfo.attrs));

        return true;
      },
    });

    md.renderer.rules.discourse_chart = (tokens, idx) => {
      const token = tokens[idx];
      const attributes = token.attrs
        .map(
          ([name, value]) =>
            `data-${camelCaseToDash(name)}="${md.utils.escapeHtml(value)}"`
        )
        .join(" ");

      return `<div class="discourse-chart is-building is-loading" ${attributes}>${md.utils.escapeHtml(
        token.content
      )}</div>\n`;
    };
  });
}
