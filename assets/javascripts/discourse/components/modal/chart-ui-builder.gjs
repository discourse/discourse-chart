import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import DModal from "discourse/components/d-modal";
import i18n from "discourse-common/helpers/i18n";
import { on } from "@ember/modifier";
import { fn } from "@ember/helper";
import EmberObject, { action } from "@ember/object";
import DButton from "discourse/components/d-button";
import { tracked } from "@glimmer/tracking";
import { TrackedArray } from "@ember-compat/tracked-built-ins";
import { Input } from "@ember/component";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import { debounce } from "discourse-common/utils/decorators";
import { TrackedObject } from "@ember-compat/tracked-built-ins";

export default class ChartUiBuilder extends Component {
  @tracked config;
  @tracked rows;

  constructor() {
    super(...arguments);
    this.initializeConfig();
  }

  get cannotInsertChart() {
    const validRows = [];
    this.rows.forEach((row) => {
      if (this.isValidRow(row)) {
        validRows.push(row);
      }
    });

    return validRows.length < 1;
  }

  @action
  addRow() {
    this.rows.pushObject(this._initializeRow());
  }

  @action
  removeRow(row) {
    this.rows.removeObject(row);

    if (this.rows.length === 0) {
      this.rows.pushObject(this._initializeRow());
    }
  }

  @action
  insertChart() {
    this.args.model.toolbarEvent.addText(this.generateChartMarkup(this.config));
    this.initializeConfig();
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
    let markup = `[chart ${chartOptions.join(" ")}]\n`;
    this.rows.forEach((row) => {
      if (this.isValidRow(row)) {
        markup += `${row.label} | ${row.value}\n`;
      }
    });
    markup += '[/chart]';
    return markup;
  }

  initializeConfig() {
    this.config = EmberObject.create({
      title: null,
      xAxisTitle: null,
    });
    this.rows = new TrackedArray([this._initializeRow()]);
  }

  _initializeRow() {
    return EmberObject.create({
      label: null,
      value: null,
    });
  }

  isValidRow(row) {
    return row.label && row.value;
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
                {{#unless this.rows}}
                  <DButton
                    @type="button"
                    @icon="plus"
                    @action={{this.addRow}}
                  />
                {{/unless}}
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
                  />
                  <Input
                    placeholder={{i18n
                      "chart.ui_builder.config.value_placeholder"
                    }}
                    class="row-value"
                    @value={{row.value}}
                  />
                  <DButton
                    @type="button"
                    @icon="plus"
                    @action={{this.addRow}}
                  />
                  <DButton
                    @type="button"
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
          @type="button"
          @disabled={{this.cannotInsertChart}}
          class="btn-primary"
          @label="chart.ui_builder.insert_chart"
          @icon="chart-line"
          @action={{this.insertChart}}
        />
      </:footer>
    </DModal>
  </template>
}
