import PreviewNodeView from "discourse/components/composer/preview-node-view";
import { camelCaseToDash } from "discourse/lib/case-converter";
import {
  previewSourceNode,
  selectPreviewSource,
} from "discourse/lib/composer/preview-block";
import ChartPreview from "../components/chart-preview";

// bbcode has no escape inside a quoted value, but accepts either quote style
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

const toDataAttrs = (params) =>
  Object.fromEntries(
    Object.entries(params).map(([name, value]) => [
      `data-${camelCaseToDash(name)}`,
      value,
    ])
  );

/** @type {import("discourse/lib/composer/rich-editor-extensions").RichEditorExtension} */
const extension = {
  nodeSpec: {
    discourse_chart: {
      attrs: { params: { default: {} } },
      group: "block",
      content: "preview_source",
      atom: true,
      defining: true,
      isolating: true,
      createGapCursor: true,
      parseDOM: [
        {
          tag: "div.discourse-chart",
          getAttrs: (dom) => ({ params: { ...dom.dataset } }),
          // plain-text rows the parser would otherwise collapse into one
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
      state.openNode(state.schema.nodes.discourse_chart, {
        params: Object.fromEntries(token.attrs),
      });
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
        null,
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
