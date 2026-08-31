import Component from "@glimmer/component";
import { action } from "@ember/object";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import didUpdate from "@ember/render-modifiers/modifiers/did-update";
import loadChartJS from "discourse/lib/load-chart-js";
import chart from "../../initializers/discourse-chart";

// matches the fallback the markdown rule applies when no type is given
const DEFAULT_TYPE = "line";

export default class ChartPreview extends Component {
  #element;
  #Chart;

  willDestroy() {
    super.willDestroy(...arguments);
    this.#destroyChart();
  }

  @action
  async renderChart(element) {
    this.#element = element;
    this.#Chart ??= await loadChartJS();

    if (this.isDestroying) {
      return;
    }

    // the renderer empties the container, so the previous canvas goes with it
    this.#destroyChart();
    element.className = "discourse-chart is-building is-loading";
    element.textContent = this.args.source;
    Object.assign(element.dataset, {
      type: DEFAULT_TYPE,
      ...this.args.node.attrs.params,
    });

    chart.renderChart(element, this.#Chart);
  }

  #destroyChart() {
    const canvas = this.#element?.querySelector("canvas");

    if (canvas) {
      this.#Chart?.getChart(canvas)?.destroy();
    }
  }

  <template>
    <div
      {{didInsert this.renderChart}}
      {{didUpdate this.renderChart @source}}
    ></div>
  </template>
}
