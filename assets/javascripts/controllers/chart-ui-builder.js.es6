import Controller from "@ember/controller";
import { default as EmberObject, computed, action } from "@ember/object";
import { isPresent } from "@ember/utils";
import { schedule } from "@ember/runloop";

export default Controller.extend({
  init() {
    this._super(...arguments);

    this._initializeConfig();
  },

  cannotInsertChart: computed("config.rows.@each.{value,label}", function () {
    const validRows = [];

    this.config.rows.forEach((row) => {
      if (this._isValidRow(row)) {
        validRows.push(row);
      }
    });

    return validRows.length < 1;
  }),

  @action
  addRow() {
    this.config.rows.pushObject(this._initializeRow());
    this._focusLastLabel();
  },

  @action
  removeRow(row) {
    this.config.rows.removeObject(row);

    if (this.config.rows.length === 0) {
      this.config.rows.pushObject(this._initializeRow());
    }

    this._focusLastLabel();
  },

  @action
  insertChart() {
    this.toolbarEvent.addText(this._generateChartMarkup(this.config));
    this._initializeConfig();
    this.send("closeModal");
  },

  _generateChartMarkup(config) {
    const chartOptions = ['type="horizontalBar"'];

    if (config.title) {
      chartOptions.push(`title="${config.title}"`);
    }

    if (config.xAxisTitle) {
      chartOptions.push(`xAxisTitle="${config.xAxisTitle}"`);
    }

    let markup = `[chart ${chartOptions.join(" ")}]\n`;
    config.rows.forEach((row) => {
      if (this._isValidRow(row)) {
        markup += `${row.label} | ${row.value}\n`;
      }
    });
    markup += "[/chart]";
    return markup;
  },

  _initializeConfig() {
    this.set(
      "config",
      EmberObject.create({
        title: null,
        xAxisTitle: null,
        rows: [this._initializeRow()],
      })
    );
  },

  _initializeRow() {
    return EmberObject.create({
      label: null,
      value: null,
    });
  },

  _isValidRow(row) {
    return isPresent(row.label) && isPresent(row.value);
  },

  _focusLastLabel() {
    schedule("afterRender", () => {
      const labels = document.querySelectorAll(".chart-ui-builder .row-label");
      labels[labels.length - 1].focus();
    });
  },
});
