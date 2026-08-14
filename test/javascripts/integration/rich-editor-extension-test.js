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
  }
);
