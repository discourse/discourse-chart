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

  // the source can change again while the library is still loading, and the
  // renders would then land out of order; only the newest one may draw
  #renderId = 0;

  willDestroy() {
    super.willDestroy(...arguments);

    this.#renderId++;
    this.#destroyChart();
  }

  @action
  async renderChart(element) {
    this.#element = element;
    const renderId = ++this.#renderId;

    this.#Chart ??= await loadChartJS();

    if (renderId !== this.#renderId) {
      return;
    }

    // the renderer consumes the container, so it is rebuilt on every change,
    // taking the chart drawn into the previous canvas with it
    this.#destroyChart();
    element.className = "discourse-chart is-building is-loading";
    element.textContent = this.args.source;

    for (const [name, value] of Object.entries(this.args.node.attrs.params)) {
      element.dataset[name] = value;
    }

    // a block inserted in the editor carries no attributes yet, and the
    // renderer has no type to draw
    element.dataset.type ||= DEFAULT_TYPE;

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
