import Component from "@glimmer/component";
import { action } from "@ember/object";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import didUpdate from "@ember/render-modifiers/modifiers/did-update";
import chart from "../../initializers/discourse-chart";

export default class ChartPreview extends Component {
  @action
  renderChart(element) {
    // the renderer consumes the container, so it is rebuilt on every change
    element.className = "discourse-chart is-building is-loading";
    element.textContent = this.args.source;

    for (const [name, value] of Object.entries(this.args.node.attrs.params)) {
      element.dataset[name] = value;
    }

    chart.renderCharts([element]);
  }

  <template>
    <div
      {{didInsert this.renderChart}}
      {{didUpdate this.renderChart @source}}
    ></div>
  </template>
}
