// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     public/app/plugins/gen.go
// Using jennies:
//     TSTypesJenny
//     PluginTsTypesJenny
//
// Run 'make gen-cue' from repository root to regenerate.

import * as common from '@grafana/schema';

export const pluginVersion = "11.1.0-pre";

export interface Options extends common.SingleStatBaseOptions {
  minVizHeight: number;
  minVizWidth: number;
  showThresholdLabels: boolean;
  showThresholdMarkers: boolean;
  sizing: common.BarGaugeSizing;
}

export const defaultOptions: Partial<Options> = {
  minVizHeight: 75,
  minVizWidth: 75,
  showThresholdLabels: false,
  showThresholdMarkers: true,
  sizing: common.BarGaugeSizing.Auto,
};
