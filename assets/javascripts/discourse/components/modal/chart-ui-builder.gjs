import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { Input } from "@ember/component";
import { fn } from "@ember/helper";
import { on } from "@ember/modifier";
import { action } from "@ember/object";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import { TrackedArray } from "@ember-compat/tracked-built-ins";
import DButton from "discourse/components/d-button";
import DModal from "discourse/components/d-modal";
import { debounce } from "discourse/lib/decorators";
import { i18n } from "discourse-i18n";

export default class ChartUiBuilder extends Component {
  @tracked config = {
    title: null,
    xAxisTitle: null,
  };
  @tracked rows = new TrackedArray([this.initializeRow()]);
  @tracked disabled = true;

  @action
  addRow() {
    this.rows.push(this.initializeRow());
  }

  @action
  removeRow(rowToBeRemoved) {
    this.rows = new TrackedArray(
      this.rows.filter((row) => row !== rowToBeRemoved)
    );

    if (this.rows.length === 0) {
      this.addRow();
    }
  }

  @action
  insertChart() {
    this.args.model.toolbarEvent.addText(this.generateChartMarkup());
    this.args.closeModal();
  }

  @debounce(100)
  focusLastLabel(element) {
    element.focus();
  }

  @debounce(100)
  setDisabled() {
    this.disabled = !this.rows.some((row) => this.isValidRow(row));
  }

  isValidRow(row) {
    return row.label && row.value;
  }

  generateChartMarkup() {
    const chartOptions = ["type='horizontalBar'"];
    if (this.config.title) {
      chartOptions.push(`title='${this.config.title}'`);
    }
    if (this.config.xAxisTitle) {
      chartOptions.push(`xAxisTitle='${this.config.xAxisTitle}'`);
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

  initializeRow() {
    return {
      label: null,
      value: null,
    };
  }

  <template>
    <DModal
      @title={{i18n "chart.ui_builder.title"}}
      class="chart-ui-builder"
      @closeModal={{@closeModal}}
      @tagName="form"
    >
      <:body>
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
                  {{on "input" this.setDisabled}}
                />
                <Input
                  placeholder={{i18n
                    "chart.ui_builder.config.value_placeholder"
                  }}
                  class="row-value"
                  @value={{row.value}}
                  {{on "input" this.setDisabled}}
                />
                <DButton @icon="plus" @action={{this.addRow}} />
                <DButton @icon="trash-can" @action={{fn this.removeRow row}} />
              </div>
            {{/each}}
          </div>
        </section>
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
