import { withPluginApi } from "discourse/lib/plugin-api";
import ChartUiBuilder from "../discourse/components/modal/chart-ui-builder";

function initializeChartUIBuilder(api) {
  const siteSettings = api.container.lookup("service:site-settings");
  const modal = api.container.lookup("service:modal");

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
    withPluginApi("1.13.0", initializeChartUIBuilder);
  },
};
