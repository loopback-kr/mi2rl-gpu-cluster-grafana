// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     public/app/plugins/gen.go
// Using jennies:
//     TSTypesJenny
//     LatestMajorsOrXJenny
//     PluginEachMajorJenny
//
// Run 'make gen-cue' from repository root to regenerate.

import * as common from '@grafana/schema';

export const pluginVersion = "10.2.1";

/**
 * Identical to timeseries... except it does not have timezone settings
 */
export interface Options {
  legend: common.VizLegendOptions;
  tooltip: common.VizTooltipOptions;
  /**
   * Name of the x field to use (defaults to first number)
   */
  xField?: string;
}

export interface FieldConfig extends common.GraphFieldConfig {}