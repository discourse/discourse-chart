import { settled } from "@ember/test-helpers";
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

    hooks.beforeEach(async function () {
      this.siteSettings.discourse_chart_enabled = true;

      await resetRichEditorExtensions();
      registerRichEditorExtension(richEditorExtension);
    });

    [
      ["plain", CHART],
      [
        "escaped in HTML",
        '[chart type="bar" title="R&D <x>"]\n1,2,3\n[/chart]',
      ],
      [
        "quoted with the other mark",
        `[chart type="bar" title='say "hi"']\n1,2,3\n[/chart]`,
      ],
    ].forEach(([name, markdown]) => {
      test(`round-trips a chart with a value ${name}`, async function (assert) {
        await testMarkdown(assert, markdown, () => {}, markdown);
      });
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

    test("gives a chart it just inserted a type to draw", async function (assert) {
      const [editorClass] = await setupRichEditor(assert, "");
      const { view } = editorClass;

      view.dispatch(view.state.tr.insertText("[chart"));
      const pos = view.state.selection.from;
      view.someProp("handleTextInput", (f) => f(view, pos, pos, "]"));
      await settled();

      // the markdown rule defaults the type; a block inserted here has no attributes
      assert
        .dom(".composer-preview-node__preview .discourse-chart")
        .hasAttribute("data-type", "line");
      assert
        .dom(".composer-preview-node__preview .discourse-chart-error")
        .doesNotExist();
      assert.strictEqual(
        view.state.selection.$head.parent.type.name,
        "preview_source",
        "and typing carries on inside it"
      );
    });
  }
);
