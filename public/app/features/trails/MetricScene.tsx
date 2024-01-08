import { css } from '@emotion/css';
import React, { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneFlexLayout,
  SceneFlexItem,
  SceneQueryRunner,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  PanelBuilders,
  sceneGraph,
} from '@grafana/scenes';
import { ToolbarButton, Box, Stack, Icon, TabsBar, Tab, useStyles2 } from '@grafana/ui';

import { getAutoQueriesForMetric } from './AutomaticMetricQueries/AutoQueryEngine';
import { AutoVizPanel } from './AutomaticMetricQueries/AutoVizPanel';
import { buildBreakdownActionScene } from './BreakdownScene';
import { buildMetricOverviewScene } from './MetricOverviewScene';
import { MetricSelectScene } from './MetricSelectScene';
import { SelectMetricAction } from './SelectMetricAction';
import { getTrailStore } from './TrailStore/TrailStore';
import {
  ActionViewDefinition,
  ActioViewType,
  getVariablesWithMetricConstant,
  LOGS_METRIC,
  MakeOptional,
  OpenEmbeddedTrailEvent,
} from './shared';
import { getTrailFor } from './utils';

export interface MetricSceneState extends SceneObjectState {
  body: SceneFlexLayout;
  metric: string;
  actionView?: string;
}

export class MetricScene extends SceneObjectBase<MetricSceneState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['actionView'] });

  public constructor(state: MakeOptional<MetricSceneState, 'body'>) {
    super({
      $variables: state.$variables ?? getVariablesWithMetricConstant(state.metric),
      body: state.body ?? buildGraphScene(state.metric),
      ...state,
    });
  }

  getUrlState() {
    return { actionView: this.state.actionView };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    if (typeof values.actionView === 'string') {
      if (this.state.actionView !== values.actionView) {
        const actionViewDef = actionViewsDefinitions.find((v) => v.value === values.actionView);
        if (actionViewDef) {
          this.setActionView(actionViewDef.value);
        }
      }
    } else if (values.actionView === null) {
      this.setActionView(undefined);
    }
  }

  public setActionView(actionView?: ActioViewType) {
    const { body } = this.state;
    const actionViewDef = actionViewsDefinitions.find((v) => v.value === actionView);

    if (actionViewDef && actionViewDef.value !== this.state.actionView) {
      // reduce max height for main panel to reduce height flicker
      body.state.children[0].setState({ maxHeight: MAIN_PANEL_MIN_HEIGHT });
      body.setState({ children: [...body.state.children.slice(0, 2), actionViewDef.getScene()] });
      this.setState({ actionView: actionViewDef.value });
    } else {
      // restore max height
      body.state.children[0].setState({ maxHeight: MAIN_PANEL_MAX_HEIGHT });
      body.setState({ children: body.state.children.slice(0, 2) });
      this.setState({ actionView: undefined });
    }
  }

  static Component = ({ model }: SceneComponentProps<MetricScene>) => {
    const { body } = model.useState();
    return <body.Component model={body} />;
  };
}

const actionViewsDefinitions: ActionViewDefinition[] = [
  { displayName: 'Overview', value: 'overview', getScene: buildMetricOverviewScene },
  { displayName: 'Breakdown', value: 'breakdown', getScene: buildBreakdownActionScene },
  { displayName: 'Logs', value: 'logs', getScene: buildLogsScene },
  { displayName: 'Related metrics', value: 'related', getScene: buildRelatedMetricsScene },
];

export interface MetricActionBarState extends SceneObjectState {}

export class MetricActionBar extends SceneObjectBase<MetricActionBarState> {
  public getButtonVariant(actionViewName: string, currentView: string | undefined) {
    return currentView === actionViewName ? 'active' : 'canvas';
  }

  public onOpenTrail = () => {
    this.publishEvent(new OpenEmbeddedTrailEvent(), true);
  };

  public static Component = ({ model }: SceneComponentProps<MetricActionBar>) => {
    const metricScene = sceneGraph.getAncestor(model, MetricScene);
    const styles = useStyles2(getStyles);
    const trail = getTrailFor(model);
    const [isBookmarked, setBookmarked] = useState(false);
    const { actionView } = metricScene.useState();

    const onBookmarkTrail = () => {
      getTrailStore().addBookmark(trail);
      setBookmarked(!isBookmarked);
    };

    if (!actionView) {
      metricScene.setActionView(actionViewsDefinitions[0].value);
    }

    return (
      <Box paddingY={1}>
        <div className={styles.actions}>
          <Stack gap={2}>
            <ToolbarButton variant={'canvas'} icon="compass" tooltip="Open in explore (todo)" disabled>
              Explore
            </ToolbarButton>
            <ToolbarButton variant={'canvas'}>Add to dashboard</ToolbarButton>
            <ToolbarButton variant={'canvas'} icon="share-alt" tooltip="Copy url (todo)" disabled />
            <ToolbarButton
              variant={'canvas'}
              icon={
                isBookmarked ? (
                  <Icon name={'favorite'} type={'mono'} size={'lg'} />
                ) : (
                  <Icon name={'star'} type={'default'} size={'lg'} />
                )
              }
              tooltip={'Bookmark'}
              onClick={onBookmarkTrail}
            />
            {trail.state.embedded && (
              <ToolbarButton variant={'canvas'} onClick={model.onOpenTrail}>
                Open
              </ToolbarButton>
            )}
          </Stack>
        </div>

        <TabsBar>
          {actionViewsDefinitions.map((tab, index) => {
            return (
              <Tab
                key={index}
                label={tab.displayName}
                active={actionView === tab.value}
                onChangeTab={() => metricScene.setActionView(tab.value)}
              />
            );
          })}
        </TabsBar>
      </Box>
    );
  };
}

function getStyles(theme: GrafanaTheme2) {
  return {
    actions: css({
      [theme.breakpoints.up(theme.breakpoints.values.md)]: {
        position: 'absolute',
        right: 0,
        zIndex: 2,
      },
    }),
  };
}

const MAIN_PANEL_MIN_HEIGHT = 280;
const MAIN_PANEL_MAX_HEIGHT = '40%';

function buildGraphScene(metric: string) {
  const autoQuery = getAutoQueriesForMetric(metric);
  const bodyAutoVizPanel = new AutoVizPanel({ autoQuery });

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: MAIN_PANEL_MIN_HEIGHT,
        maxHeight: MAIN_PANEL_MAX_HEIGHT,
        body: bodyAutoVizPanel,
      }),
      new SceneFlexItem({
        ySizing: 'content',
        body: new MetricActionBar({}),
      }),
    ],
  });
}

function buildLogsScene() {
  return new SceneFlexItem({
    $data: new SceneQueryRunner({
      queries: [
        {
          refId: 'A',
          datasource: { uid: 'gdev-loki' },
          expr: '{${filters}} | logfmt',
        },
      ],
    }),
    body: PanelBuilders.logs()
      .setTitle('Logs')
      .setHeaderActions(new SelectMetricAction({ metric: LOGS_METRIC, title: 'Open' }))
      .build(),
  });
}

function buildRelatedMetricsScene() {
  return new SceneFlexItem({
    body: new MetricSelectScene({}),
  });
}
