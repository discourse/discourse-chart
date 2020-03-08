import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";
import { readOnly } from "@ember/object/computed";

function initializeChartUIBuilder(api) {
  api.modifyClass("controller:composer", {
    canBuildChart: readOnly("siteSettings.discourse_chart_enabled"),

    actions: {
      showChartUIBuilder() {
        showModal("chart-ui-builder").set("toolbarEvent", this.toolbarEvent);
      }
    }
  });

  api.addToolbarPopupMenuOptionsCallback(() => {
    return {
      action: "showChartUIBuilder",
      icon: "chart-line",
      label: "chart.ui_builder.title",
      condition: "canBuildChart"
    };
  });
}

export default {
  name: "add-chart-ui-builder",

  initialize() {
    withPluginApi("0.8.7", initializeChartUIBuilder);
  }
};
