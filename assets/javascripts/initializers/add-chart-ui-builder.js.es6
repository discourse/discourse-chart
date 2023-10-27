import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";

function initializeChartUIBuilder(api) {
  const siteSettings = api.container.lookup("service:site-settings");

  api.addComposerToolbarPopupMenuOption({
    label: "chart.ui_builder.title",
    icon: "chart-line",
    condition: () => {
      return siteSettings.discourse_chart_enabled;
    },
    action: (toolbarEvent) => {
      showModal("chart-ui-builder").set("toolbarEvent", toolbarEvent);
    },
  });
}

export default {
  name: "add-chart-ui-builder",

  initialize() {
    withPluginApi("1.13.0", initializeChartUIBuilder);
  },
};
