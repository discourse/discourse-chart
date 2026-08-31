import { withPluginApi } from "discourse/lib/plugin-api";
import ChartUiBuilder from "../discourse/components/modal/chart-ui-builder";
import richEditorExtension from "../discourse/lib/rich-editor-extension";

function initializeChartUIBuilder(api) {
  const siteSettings = api.container.lookup("service:site-settings");
  const modal = api.container.lookup("service:modal");

  api.registerRichEditorExtension(richEditorExtension);

  api.addComposerToolbarPopupMenuOption({
    label: "chart.ui_builder.title",
    icon: "chart-line",
    condition: () => {
      return siteSettings.discourse_chart_enabled;
    },
    action: (toolbarEvent) => {
      modal.show(ChartUiBuilder, { model: { toolbarEvent } });
    },
  });
}

export default {
  name: "add-chart-ui-builder",

  initialize() {
    withPluginApi(initializeChartUIBuilder);
  },
};
