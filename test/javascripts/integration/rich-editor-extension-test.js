import { module, test } from "qunit";
import {
  registerRichEditorExtension,
  resetRichEditorExtensions,
} from "discourse/lib/composer/rich-editor-extensions";
import { setupRenderingTest } from "discourse/tests/helpers/component-test";
import {
  setupRichEditor,
  testMarkdown,
} from "discourse/tests/helpers/rich-editor-helper";
import richEditorExtension from "discourse/plugins/discourse-chart/discourse/lib/rich-editor-extension";

const CHART = '[chart type="bar" labels="a,b,c"]\n1,2,3\n[/chart]';

module(
  "Integration | Component | prosemirror-editor - chart extension",
  function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
      this.siteSettings.discourse_chart_enabled = true;

      resetRichEditorExtensions().then(() => {
        registerRichEditorExtension(richEditorExtension);
      });
    });

    test("round-trips a chart", async function (assert) {
      await testMarkdown(
        assert,
        CHART,
        (a) => a.dom(".composer-preview-node").exists(),
        CHART
      );
    });

    test("keeps the data when the text around it is edited", async function (assert) {
      const [editorClass] = await setupRichEditor(
        assert,
        `before\n\n${CHART}\n\nafter`
      );
      const { view } = editorClass;

      let chartPos;
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === "discourse_chart") {
          chartPos = pos;
        }
      });

      // delete across the chart's closing boundary, as backspacing at the start
      // of the paragraph that follows it would
      const boundary = chartPos + view.state.doc.nodeAt(chartPos).nodeSize;
      view.dispatch(view.state.tr.delete(boundary, boundary + 1));

      assert.true(
        editorClass.value.includes(CHART),
        `the chart data is untouched, got: ${editorClass.value}`
      );
    });

    test("round-trips attribute values that have to be escaped in HTML", async function (assert) {
      const chart = '[chart type="bar" title="R&D <x>"]\n1,2,3\n[/chart]';

      await testMarkdown(
        assert,
        chart,
        (a) => a.dom(".composer-preview-node").exists(),
        chart
      );
    });

    test("keeps the rows of a pasted chart", async function (assert) {
      const [editorClass] = await setupRichEditor(assert, "");
      const { view } = editorClass;

      view.pasteHTML(
        '<div class="discourse-chart is-building is-loading" data-type="bar" data-title="T">| a | b\n| 1 | 2\n| 3 | 4</div>'
      );

      assert.strictEqual(
        editorClass.value.trim(),
        '[chart type="bar" title="T"]\n| a | b\n| 1 | 2\n| 3 | 4\n[/chart]',
        "every row survives the round trip through cooked HTML"
      );
    });

    test("puts the caret in the data of a chart it just inserted", async function (assert) {
      const [editorClass] = await setupRichEditor(assert, "before");
      const { view } = editorClass;

      view.dispatch(view.state.tr.insertText("[chart"));
      const pos = view.state.selection.from;
      view.someProp("handleTextInput", (f) => f(view, pos, pos, "]"));

      const { selection } = view.state;
      assert.strictEqual(
        selection.$head.parent.type.name,
        "preview_source",
        "typing carries on inside the new chart"
      );
    });
  }
);
