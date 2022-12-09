import { randomLcg } from 'd3-random';

import {
  ArrayVector,
  FieldColorModeId,
  FieldDTO,
  FieldType,
  MutableDataFrame,
  NodeGraphDataFrameFieldNames,
} from '@grafana/data';

import * as serviceMapResponseSmall from './testData/serviceMapResponse';
import * as serviceMapResponsMedium from './testData/serviceMapResponse2';

export function generateRandomNodes(count = 10, seed?: number) {
  const nodes = [];
  const rand = randomLcg(seed);

  const root = {
    id: 'root',
    title: 'root',
    subTitle: 'client',
    success: 1,
    error: 0,
    stat1: Math.random(),
    stat2: Math.random(),
    edges: [] as any[],
  };
  nodes.push(root);
  const nodesWithoutMaxEdges = [root];

  const maxEdges = 3;

  for (let i = 1; i < count; i++) {
    const node = makeRandomNode(i);
    nodes.push(node);
    const sourceIndex = Math.floor(rand() * Math.floor(nodesWithoutMaxEdges.length - 1));
    const source = nodesWithoutMaxEdges[sourceIndex];
    source.edges.push(node.id);
    if (source.edges.length >= maxEdges) {
      nodesWithoutMaxEdges.splice(sourceIndex, 1);
    }
    nodesWithoutMaxEdges.push(node);
  }

  // Add some random edges to create possible cycle
  const additionalEdges = Math.floor(count / 2);
  for (let i = 0; i <= additionalEdges; i++) {
    const sourceIndex = Math.floor(rand() * Math.floor(nodes.length - 1));
    const targetIndex = Math.floor(rand() * Math.floor(nodes.length - 1));
    if (sourceIndex === targetIndex || nodes[sourceIndex].id === '0' || nodes[targetIndex].id === '0') {
      continue;
    }

    nodes[sourceIndex].edges.push(nodes[targetIndex].id);
  }

  const nodeFields: Record<string, Omit<FieldDTO, 'name'> & { values: ArrayVector }> = {
    [NodeGraphDataFrameFieldNames.id]: {
      values: new ArrayVector(),
      type: FieldType.string,
      config: {
        links: [
          {
            title: 'test data link',
            url: '',
            internal: {
              query: { scenarioId: 'logs', alias: 'from service graph', stringInput: 'tes' },
              datasourceUid: 'gdev-testdata',
              datasourceName: 'gdev-testdata',
            },
          },
        ],
      },
    },
    [NodeGraphDataFrameFieldNames.title]: {
      values: new ArrayVector(),
      type: FieldType.string,
    },
    [NodeGraphDataFrameFieldNames.subTitle]: {
      values: new ArrayVector(),
      type: FieldType.string,
    },
    [NodeGraphDataFrameFieldNames.mainStat]: {
      values: new ArrayVector(),
      type: FieldType.number,
      config: { displayName: 'Transactions per second' },
    },
    [NodeGraphDataFrameFieldNames.secondaryStat]: {
      values: new ArrayVector(),
      type: FieldType.number,
      config: { displayName: 'Average duration' },
    },
    [NodeGraphDataFrameFieldNames.arc + 'success']: {
      values: new ArrayVector(),
      type: FieldType.number,
      config: { color: { fixedColor: 'green', mode: FieldColorModeId.Fixed }, displayName: 'Success' },
    },
    [NodeGraphDataFrameFieldNames.arc + 'errors']: {
      values: new ArrayVector(),
      type: FieldType.number,
      config: { color: { fixedColor: 'red', mode: FieldColorModeId.Fixed }, displayName: 'Errors' },
    },
  };

  const nodeFrame = new MutableDataFrame({
    name: 'nodes',
    fields: Object.keys(nodeFields).map((key) => ({
      ...nodeFields[key],
      name: key,
    })),
    meta: { preferredVisualisationType: 'nodeGraph' },
  });

  const edgesFrame = new MutableDataFrame({
    name: 'edges',
    fields: [
      { name: NodeGraphDataFrameFieldNames.id, values: new ArrayVector(), type: FieldType.string },
      { name: NodeGraphDataFrameFieldNames.source, values: new ArrayVector(), type: FieldType.string },
      { name: NodeGraphDataFrameFieldNames.target, values: new ArrayVector(), type: FieldType.string },
      { name: NodeGraphDataFrameFieldNames.mainStat, values: new ArrayVector(), type: FieldType.number },
    ],
    meta: { preferredVisualisationType: 'nodeGraph' },
  });

  const edgesSet = new Set();
  for (const node of nodes) {
    nodeFields.id.values.add(node.id);
    nodeFields.title.values.add(node.title);
    nodeFields[NodeGraphDataFrameFieldNames.subTitle].values.add(node.subTitle);
    nodeFields[NodeGraphDataFrameFieldNames.mainStat].values.add(node.stat1);
    nodeFields[NodeGraphDataFrameFieldNames.secondaryStat].values.add(node.stat2);
    nodeFields.arc__success.values.add(node.success);
    nodeFields.arc__errors.values.add(node.error);
    for (const edge of node.edges) {
      const id = `${node.id}--${edge}`;
      // We can have duplicate edges when we added some more by random
      if (edgesSet.has(id)) {
        continue;
      }
      edgesSet.add(id);
      edgesFrame.fields[0].values.add(`${node.id}--${edge}`);
      edgesFrame.fields[1].values.add(node.id);
      edgesFrame.fields[2].values.add(edge);
      edgesFrame.fields[3].values.add(Math.random() * 100);
    }
  }

  return [nodeFrame, edgesFrame];
}

function makeRandomNode(index: number) {
  const success = Math.random();
  const error = 1 - success;
  return {
    id: `service_${index}`,
    title: `service_${index}`,
    subTitle: 'service',
    success,
    error,
    stat1: Math.random(),
    stat2: Math.random(),
    edges: [],
  };
}

export function savedNodesResponse(size: 'small' | 'medium'): any {
  const response = size === 'small' ? serviceMapResponseSmall : serviceMapResponsMedium;
  return [new MutableDataFrame(response.nodes), new MutableDataFrame(response.edges)];
}

// Generates node graph data but only returns the edges
export function generateRandomEdges(count = 10, seed = 1) {
  return generateRandomNodes(count, seed)[1];
}
