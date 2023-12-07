import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import DModal from "discourse/components/d-modal";
import i18n from "discourse-common/helpers/i18n";
import { on } from "@ember/modifier";
import { fn } from "@ember/helper";
import EmberObject, { action } from "@ember/object";
import DButton from "discourse/components/d-button";
import { tracked } from "@glimmer/tracking";
import { Input } from "@ember/component";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import { debounce } from "discourse-common/utils/decorators";

export default class ChartUiBuilder extends Component {
  @tracked config;
  @tracked rows;
  @tracked disabled = true;

  constructor() {
    super(...arguments);
    this.initializeConfig();
  }

  @action
  isValidRow(row) {
    this.disabled = !(row.label && row.value);
  }

  @action
  addRow() {
    this.rows = this.rows.push(this.initializeRow());
  }

  @action
  removeRow(rowToBeRemoved) {
    this.rows = this.rows.filter((row) => row !== rowToBeRemoved);
    if (this.rows.length === 0) {
      this.rows = [this.initializeRow()];
    }
  }

  @action
  insertChart() {
    this.args.model.toolbarEvent.addText(this.generateChartMarkup(this.config));
    this.args.closeModal();
  }

  generateChartMarkup(config) {
    const chartOptions = ["type='horizontalBar'"];
    if (config.title) {
      chartOptions.push(`title='${config.title}'`);
    }
    if (config.xAxisTitle) {
      chartOptions.push(`xAxisTitle='${config.xAxisTitle}'`);
    }
    let markup = `[chart ${chartOptions.join(" ")}]`;
    markup += "\n";
    this.rows.forEach((row) => {
      if (this.isValidRow(row)) {
        markup += `${row.label} | ${row.value}`;
        markup += "\n";
      }
    });
    markup += "[/chart]";
    return markup;
  }

  initializeConfig() {
    this.config = EmberObject.create({
      title: null,
      xAxisTitle: null,
    });
    this.rows = [this.initializeRow()];
  }

  initializeRow() {
    return EmberObject.create({
      label: null,
      value: null,
    });
  }

  @debounce(100)
  focusLastLabel(element) {
    element.focus();
  }

  <template>
    <DModal
      @title={{i18n "chart.ui_builder.title"}}
      class="chart-ui-builder"
      @closeModal={{@closeModal}}
    >
      <:body>
        <form>
          <section class="options-form">
            <Input
              placeholder={{i18n "chart.ui_builder.config.title_placeholder"}}
              @value={{this.config.title}}
            />
            <Input
              placeholder={{i18n
                "chart.ui_builder.config.x_axis_title_placeholder"
              }}
              @value={{this.config.xAxisTitle}}
            />
          </section>

          <section class="rows-form">
            <div class="section-title">
              <h3>{{i18n "chart.ui_builder.chart_data"}}</h3>
              <div class="section-actions">
                <DButton @icon="plus" @action={{this.addRow}} />
              </div>
            </div>
            <div class="section-body">
              {{#each this.rows as |row|}}
                <div class="config-row">
                  <Input
                    placeholder={{i18n
                      "chart.ui_builder.config.label_placeholder"
                    }}
                    class="row-label"
                    @value={{row.label}}
                    {{didInsert this.focusLastLabel}}
                    {{on "input" (fn this.isValidRow row)}}
                  />
                  <Input
                    placeholder={{i18n
                      "chart.ui_builder.config.value_placeholder"
                    }}
                    class="row-value"
                    @value={{row.value}}
                    {{on "input" (fn this.isValidRow row)}}
                  />
                  <DButton @icon="plus" @action={{this.addRow}} />
                  <DButton
                    @icon="trash-alt"
                    @action={{fn this.removeRow row}}
                  />
                </div>
              {{/each}}
            </div>
          </section>
        </form>
      </:body>
      <:footer>
        <DButton
          @disabled={{this.disabled}}
          class="btn-primary"
          @label="chart.ui_builder.insert_chart"
          @icon="chart-line"
          @action={{this.insertChart}}
        />
      </:footer>
    </DModal>
  </template>
}
