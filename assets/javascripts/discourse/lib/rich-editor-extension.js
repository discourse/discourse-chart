import PreviewNodeView from "discourse/components/composer/preview-node-view";
import {
  previewSourceNode,
  selectPreviewSource,
} from "discourse/lib/composer/preview-block";
import ChartPreview from "../components/chart-preview";

const dashToCamelCase = (str) =>
  str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());

// bbcode has no escape sequence inside a quoted value, but it accepts either
// quote style, so a value containing one can be wrapped in the other
function quoteAttrValue(value) {
  value = `${value}`;

  if (!value.includes(`"`)) {
    return `"${value}"`;
  }

  if (!value.includes(`'`)) {
    return `'${value}'`;
  }

  return `"${value.replaceAll(`"`, "")}"`;
}

function toDataAttrs(params) {
  const attrs = {};

  for (const [name, value] of Object.entries(params)) {
    attrs[`data-${name.replace(/([a-z])(?=[A-Z])/g, "$1-").toLowerCase()}`] =
      value;
  }

  return attrs;
}

/** @type {import("discourse/lib/composer/rich-editor-extensions").RichEditorExtension} */
const extension = {
  nodeSpec: {
    discourse_chart: {
      attrs: { params: { default: {} } },
      group: "block",
      // isolating keeps the text around it from merging into the data
      content: "preview_source",
      // the node view owns the source, so the editor moves over the block as a
      // unit rather than stepping into text it is not showing
      atom: true,
      defining: true,
      isolating: true,
      selectable: true,
      createGapCursor: true,
      parseDOM: [
        {
          tag: "div.discourse-chart",
          getAttrs: (dom) => ({ params: { ...dom.dataset } }),
          // a cooked chart holds one row per line as plain text, which the
          // parser would otherwise collapse into a single row
          getContent: (dom, schema) =>
            schema.nodes.discourse_chart.create(
              null,
              previewSourceNode(schema, dom.textContent)
            ).content,
        },
      ],
      toDOM: (node) => [
        "div",
        { class: "discourse-chart", ...toDataAttrs(node.attrs.params) },
        0,
      ],
    },
  },

  nodeViews: {
    discourse_chart: {
      component: PreviewNodeView,
      hasContent: true,
      options: { preview: ChartPreview },
    },
  },

  parse: {
    discourse_chart: (state, token) => {
      const params = {};
      for (const [name, value] of token.attrs ?? []) {
        params[dashToCamelCase(name.replace(/^data-/, ""))] = value;
      }

      state.openNode(state.schema.nodes.discourse_chart, { params });
      state.openNode(state.schema.nodes.preview_source);
      state.addText(token.content.trim());
      state.closeNode();
      state.closeNode();

      return true;
    },
  },

  inputRules: ({ schema, pmState: { TextSelection } }) => ({
    match: /\[chart]$/,
    handler: (state, match, start, end) => {
      const chart = schema.nodes.discourse_chart.create(
        { params: {} },
        previewSourceNode(schema, "")
      );
      const isAtStart = state.doc.resolve(start).parentOffset === 0;
      const from = isAtStart ? start - 1 : start;

      return selectPreviewSource(
        state.tr.replaceWith(from, end, chart),
        TextSelection,
        from
      );
    },
  }),

  serializeNode: {
    discourse_chart(state, node) {
      const params = Object.entries(node.attrs.params)
        .map(([name, value]) => ` ${name}=${quoteAttrValue(value)}`)
        .join("");

      state.write(`[chart${params}]\n`);
      state.text(node.textContent, false);
      state.write("\n[/chart]");
      state.closeBlock(node);
    },
  },
};

export default extension;
