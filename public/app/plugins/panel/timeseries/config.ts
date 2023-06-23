import {
  FieldColorModeId,
  FieldConfigEditorBuilder,
  FieldConfigProperty,
  FieldType,
  identityOverrideProcessor,
  SetFieldConfigOptionsArgs,
  Field,
} from '@grafana/data';
import {
  BarAlignment,
  GraphDrawStyle,
  GraphFieldConfig,
  GraphGradientMode,
  LineInterpolation,
  LineStyle,
  VisibilityMode,
  StackingMode,
  GraphTresholdsStyleMode,
  GraphTransform,
} from '@grafana/schema';
import { graphFieldOptions, commonOptionsBuilder } from '@grafana/ui';

import { InsertNullsEditor } from './InsertNullsEditor';
import { LineStyleEditor } from './LineStyleEditor';
import { SpanNullsEditor } from './SpanNullsEditor';
import { ThresholdsStyleEditor } from './ThresholdsStyleEditor';

export const defaultGraphConfig: GraphFieldConfig = {
  drawStyle: GraphDrawStyle.Line,
  lineInterpolation: LineInterpolation.Linear,
  lineWidth: 1,
  fillOpacity: 0,
  gradientMode: GraphGradientMode.None,
  barAlignment: BarAlignment.Center,
  stacking: {
    mode: StackingMode.None,
    group: 'A',
  },
  axisGridShow: true,
  axisCenteredZero: false,
};

const categoryStyles = ['Graph styles'];

export function addPointAndLineStyles<T extends GraphFieldConfig>(
  cfg: T,
  builder: FieldConfigEditorBuilder<T>,
  hideFromDefaults: boolean,
  excludeForBarChartPanel?: boolean // bar chart adds this explicitly at the root
) {
  builder
    .addRadio({
      path: 'drawStyle',
      name: 'Style',
      category: categoryStyles,
      defaultValue: cfg.drawStyle,
      settings: {
        options: graphFieldOptions.drawStyle,
      },
      hideFromDefaults,
    })
    .addRadio({
      path: 'lineInterpolation',
      name: 'Line interpolation',
      category: categoryStyles,
      defaultValue: cfg.lineInterpolation,
      settings: {
        options: graphFieldOptions.lineInterpolation,
      },
      showIf: (config) => config.drawStyle === GraphDrawStyle.Line,
      hideFromDefaults,
    });

  if (!excludeForBarChartPanel) {
    builder
      .addRadio({
        path: 'barAlignment',
        name: 'Bar alignment',
        category: categoryStyles,
        defaultValue: cfg.barAlignment,
        settings: {
          options: graphFieldOptions.barAlignment,
        },
        showIf: (config) => config.drawStyle === GraphDrawStyle.Bars,
        hideFromDefaults,
      })
      .addSliderInput({
        path: 'lineWidth',
        name: 'Line width',
        category: categoryStyles,
        defaultValue: cfg.lineWidth,
        settings: {
          min: 0,
          max: 10,
          step: 1,
          ariaLabelForHandle: 'Line width',
        },
        showIf: (config) => config.drawStyle !== GraphDrawStyle.Points,
        hideFromDefaults,
      })
      .addSliderInput({
        path: 'fillOpacity',
        name: 'Fill opacity',
        category: categoryStyles,
        defaultValue: cfg.fillOpacity,
        settings: {
          min: 0,
          max: 100,
          step: 1,
          ariaLabelForHandle: 'Fill opacity',
        },
        showIf: (config) => config.drawStyle !== GraphDrawStyle.Points,
        hideFromDefaults,
      })
      .addRadio({
        path: 'gradientMode',
        name: 'Gradient mode',
        category: categoryStyles,
        defaultValue: graphFieldOptions.fillGradient[0].value,
        settings: {
          options: graphFieldOptions.fillGradient,
        },
        showIf: (config) => config.drawStyle !== GraphDrawStyle.Points,
        hideFromDefaults,
      })
      .addFieldNamePicker({
        path: 'fillBelowTo',
        name: 'Fill below to',
        category: categoryStyles,
        settings: {
          filter: (field: Field) => field.type === FieldType.number,
        },
        hideFromDefaults,
      });
  }

  builder
    .addCustomEditor<void, LineStyle>({
      id: 'lineStyle',
      path: 'lineStyle',
      name: 'Line style',
      category: categoryStyles,
      showIf: (config) => config.drawStyle === GraphDrawStyle.Line,
      editor: LineStyleEditor,
      override: LineStyleEditor,
      process: identityOverrideProcessor,
      shouldApply: (field) => field.type === FieldType.number,
      hideFromDefaults,
    })
    .addCustomEditor<void, boolean>({
      id: 'spanNulls',
      path: 'spanNulls',
      name: 'Connect null values',
      category: categoryStyles,
      defaultValue: false,
      editor: SpanNullsEditor,
      override: SpanNullsEditor,
      showIf: (config) => config.drawStyle === GraphDrawStyle.Line,
      shouldApply: (field) => field.type !== FieldType.time,
      process: identityOverrideProcessor,
      hideFromDefaults,
    })
    .addCustomEditor<void, boolean>({
      id: 'insertNulls',
      path: 'insertNulls',
      name: 'Disconnect values',
      category: categoryStyles,
      defaultValue: false,
      editor: InsertNullsEditor,
      override: InsertNullsEditor,
      showIf: (config) => config.drawStyle === GraphDrawStyle.Line,
      shouldApply: (field) => field.type !== FieldType.time,
      process: identityOverrideProcessor,
      hideFromDefaults,
    })
    .addRadio({
      path: 'showPoints',
      name: 'Show points',
      category: categoryStyles,
      defaultValue: graphFieldOptions.showPoints[0].value,
      settings: {
        options: graphFieldOptions.showPoints,
      },
      showIf: (config) => config.drawStyle !== GraphDrawStyle.Points,
      hideFromDefaults,
    })
    .addSliderInput({
      path: 'pointSize',
      name: 'Point size',
      category: categoryStyles,
      defaultValue: 5,
      settings: {
        min: 1,
        max: 40,
        step: 1,
        ariaLabelForHandle: 'Point size',
      },
      showIf: (config) => config.showPoints !== VisibilityMode.Never || config.drawStyle === GraphDrawStyle.Points,
      hideFromDefaults,
    });
}

export function getGraphFieldConfig(cfg: GraphFieldConfig): SetFieldConfigOptionsArgs<GraphFieldConfig> {
  return {
    standardOptions: {
      [FieldConfigProperty.Color]: {
        settings: {
          byValueSupport: true,
          bySeriesSupport: true,
          preferThresholdsMode: false,
        },
        defaultValue: {
          mode: FieldColorModeId.PaletteClassic,
        },
      },
    },
    useCustomConfig: (builder) => {
      addPointAndLineStyles(cfg, builder, false);

      commonOptionsBuilder.addStackingConfig(builder, cfg.stacking, categoryStyles);

      builder.addSelect({
        category: categoryStyles,
        name: 'Transform',
        path: 'transform',
        settings: {
          options: [
            {
              label: 'Constant',
              value: GraphTransform.Constant,
              description: 'The first value will be shown as a constant line',
            },
            {
              label: 'Negative Y',
              value: GraphTransform.NegativeY,
              description: 'Flip the results to negative values on the y axis',
            },
          ],
          isClearable: true,
        },
        hideFromDefaults: true,
      });

      commonOptionsBuilder.addAxisConfig(builder, cfg);
      commonOptionsBuilder.addHideFrom(builder);

      builder.addCustomEditor({
        id: 'thresholdsStyle',
        path: 'thresholdsStyle',
        name: 'Show thresholds',
        category: ['Thresholds'],
        defaultValue: { mode: GraphTresholdsStyleMode.Off },
        settings: {
          options: graphFieldOptions.thresholdsDisplayModes,
        },
        editor: ThresholdsStyleEditor,
        override: ThresholdsStyleEditor,
        process: identityOverrideProcessor,
        shouldApply: () => true,
      });
    },
  };
}
