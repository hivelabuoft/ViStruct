import type { NextApiRequest, NextApiResponse } from 'next';

interface Step {
  stepNumber: number;
  stepName: string;
  aoiDescription: string;
  calculations: string;
  coordinates: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

interface ApiResponse {
  steps: Step[];
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chartType, currentTaskName, labelName, mappedRegions } = req.body;

    if (!chartType || !currentTaskName || !mappedRegions) {
      return res.status(400).json({
        error: 'Missing required parameters: chartType, currentTaskName, or mappedRegions',
      });
    }

    // Process the mapped regions to identify relevant AOIs for finding extremum
    const steps = generateFindExtremumSteps(chartType, currentTaskName, labelName, mappedRegions);

    return res.status(200).json({ steps });
  } catch (error) {
    console.error('Error in findExtremum:', error);
    return res.status(500).json({ error: 'An error occurred while processing the request' });
  }
}

function generateFindExtremumSteps(
  chartType: string, 
  currentTaskName: string, 
  labelName: string | undefined, 
  mappedRegions: any[]
): Step[] {
  const steps: Step[] = [];
  const lowerChartType = chartType.toLowerCase();
  
  // Extract information about what we're finding (min/max)
  const isMinimum = currentTaskName.toLowerCase().includes('min');
  const extremumType = isMinimum ? 'minimum' : 'maximum';
  
  // Step 1: Identify relevant data elements based on chart type
  const dataElements = getDataElements(lowerChartType, mappedRegions);
  if (dataElements.length > 0) {
    steps.push({
      stepNumber: 1,
      stepName: `Identify ${labelName ? `'${labelName}' ` : ''}Data Elements`,
      aoiDescription: `Scan each ${getSingleElementName(lowerChartType)} associated with ${
        labelName ? `the '${labelName}' series` : 'the data'
      } and note their boundaries.`,
      calculations: 'Extracting relevant data elements from mapped regions',
      coordinates: dataElements[0] // First data element as example highlight
    });
  }
  
  // Step 2: Draw visual lines if needed (for bar charts, etc.)
  if (['bar', 'stackedbar', '100stackedbar'].includes(lowerChartType)) {
    const topLines = getTopLines(lowerChartType, dataElements, mappedRegions);
    if (topLines.length > 0) {
      steps.push({
        stepNumber: 2,
        stepName: 'Draw Top Reference Lines',
        aoiDescription: `Visualize horizontal lines at the top of each ${
          getSingleElementName(lowerChartType)
        } to compare heights.`,
        calculations: 'Connecting top points to the axis for visual comparison',
        coordinates: topLines[0] // First line as example
      });
    }
  }
  
  // Step 3: Compare values visually
  const comparisonRegion = getComparisonRegion(lowerChartType, dataElements, mappedRegions);
  if (comparisonRegion) {
    steps.push({
      stepNumber: 3,
      stepName: `Compare ${capitalizeFirst(getSingleElementName(lowerChartType))} Values`,
      aoiDescription: `Visually compare all ${getPluralElementName(lowerChartType)} to determine the ${extremumType} value.`,
      calculations: 'Visual comparison across all data elements',
      coordinates: comparisonRegion
    });
  }
  
  // Step 4: Map to axis for value determination
  const axisMapping = getAxisMapping(lowerChartType, dataElements, mappedRegions, isMinimum);
  if (axisMapping) {
    steps.push({
      stepNumber: 4,
      stepName: 'Map to Axis Reference',
      aoiDescription: `Draw a reference line from the ${extremumType} value to the appropriate axis to identify the exact value.`,
      calculations: 'Connecting the extremum to its axis reference',
      coordinates: axisMapping
    });
  }
  
  // Step 5: Highlight the extremum
  const extremum = findExtremumElement(dataElements, lowerChartType, isMinimum);
  if (extremum) {
    steps.push({
      stepNumber: 5,
      stepName: `Highlight ${capitalizeFirst(extremumType)} Value`,
      aoiDescription: `Focus on the ${getSingleElementName(lowerChartType)} representing the ${extremumType} value to complete the task.`,
      calculations: `Identified the ${extremumType} value among all data elements`,
      coordinates: extremum
    });
  }
  
  return steps;
}

// Helper functions

function getDataElements(chartType: string, mappedRegions: any[]): any[] {
  // Extract relevant data elements based on chart type
  let elements: any[] = [];
  
  switch(chartType) {
    case 'bar':
    case 'stackedbar':
    case '100stackedbar':
      elements = mappedRegions.filter(region => 
        region.type === 'bar' || region.type === 'segment'
      );
      break;
    case 'line':
    case 'area':
    case 'stackedarea':
      elements = mappedRegions.filter(region => 
        region.type === 'point' || region.type === 'line'
      );
      break;
    case 'scatter':
    case 'bubble':
      elements = mappedRegions.filter(region => 
        region.type === 'point'
      );
      break;
    case 'pie':
      elements = mappedRegions.filter(region => 
        region.type === 'slice'
      );
      break;
    default:
      elements = mappedRegions.filter(region => 
        ['bar', 'segment', 'point', 'line', 'slice'].includes(region.type)
      );
  }
  
  return elements;
}

function getTopLines(chartType: string, dataElements: any[], mappedRegions: any[]): any[] {
  // Create visual reference lines for tops of elements
  const yAxis = mappedRegions.find(region => region.type === 'y-axis');
  if (!yAxis || dataElements.length === 0) return [];
  
  return dataElements.map(element => ({
    xmin: yAxis.xmin,
    ymin: element.ymin, // Top of element (remember smaller y is higher in pixel coordinates)
    xmax: element.xmax,
    ymax: element.ymin  // Same y to create horizontal line
  }));
}

function getComparisonRegion(chartType: string, dataElements: any[], mappedRegions: any[]): any {
  // Create a region that encompasses all data elements for comparison
  if (dataElements.length === 0) return null;
  
  // Find the bounding box containing all data elements
  let xmin = Math.min(...dataElements.map(e => e.xmin));
  let ymin = Math.min(...dataElements.map(e => e.ymin));
  let xmax = Math.max(...dataElements.map(e => e.xmax));
  let ymax = Math.max(...dataElements.map(e => e.ymax));
  
  return { xmin, ymin, xmax, ymax };
}

function getAxisMapping(
  chartType: string, 
  dataElements: any[], 
  mappedRegions: any[], 
  isMinimum: boolean
): any {
  // Create a mapping line from extremum to axis
  if (dataElements.length === 0) return null;
  
  const extremum = findExtremumElement(dataElements, chartType, isMinimum);
  if (!extremum) return null;
  
  // Find the appropriate axis based on chart type
  const xAxis = mappedRegions.find(region => region.type === 'x-axis');
  const yAxis = mappedRegions.find(region => region.type === 'y-axis');
  
  if (chartType === 'bar' || chartType === 'stackedbar' || chartType === '100stackedbar') {
    // For bar charts, map horizontally to y-axis
    if (!yAxis) return null;
    return {
      xmin: yAxis.xmin,
      ymin: extremum.ymin,
      xmax: extremum.xmin,
      ymax: extremum.ymin
    };
  } else {
    // For most other charts, map vertically to x-axis
    if (!xAxis) return null;
    return {
      xmin: extremum.xmin,
      ymin: extremum.ymax,
      xmax: extremum.xmin,
      ymax: xAxis.ymin
    };
  }
}

function findExtremumElement(dataElements: any[], chartType: string, isMinimum: boolean): any {
  if (dataElements.length === 0) return null;
  
  // Different metrics based on chart type
  if (['bar', 'stackedbar', '100stackedbar'].includes(chartType)) {
    // For bar charts, height (smaller ymin means taller bar)
    if (isMinimum) {
      // For minimum, find largest ymin (shortest bar)
      return dataElements.reduce((min, current) => 
        current.ymin > min.ymin ? current : min, dataElements[0]);
    } else {
      // For maximum, find smallest ymin (tallest bar)
      return dataElements.reduce((max, current) => 
        current.ymin < max.ymin ? current : max, dataElements[0]);
    }
  } else if (['line', 'area', 'scatter', 'bubble'].includes(chartType)) {
    // For these charts, vertical position matters
    if (isMinimum) {
      // For minimum, find largest ymax (lowest point)
      return dataElements.reduce((min, current) => 
        current.ymax > min.ymax ? current : min, dataElements[0]);
    } else {
      // For maximum, find smallest ymin (highest point)
      return dataElements.reduce((max, current) => 
        current.ymin < max.ymin ? current : max, dataElements[0]);
    }
  } else {
    // Default case, use area size
    if (isMinimum) {
      // For minimum, find smallest area
      return dataElements.reduce((min, current) => {
        const currentArea = (current.xmax - current.xmin) * (current.ymax - current.ymin);
        const minArea = (min.xmax - min.xmin) * (min.ymax - min.ymin);
        return currentArea < minArea ? current : min;
      }, dataElements[0]);
    } else {
      // For maximum, find largest area
      return dataElements.reduce((max, current) => {
        const currentArea = (current.xmax - current.xmin) * (current.ymax - current.ymin);
        const maxArea = (max.xmax - max.xmin) * (max.ymax - max.ymin);
        return currentArea > maxArea ? current : max;
      }, dataElements[0]);
    }
  }
}

// Utility functions

function getSingleElementName(chartType: string): string {
  switch(chartType) {
    case 'bar':
    case 'stackedbar':
    case '100stackedbar':
      return 'bar';
    case 'line':
      return 'point';
    case 'scatter':
    case 'bubble':
      return 'point';
    case 'pie':
      return 'slice';
    default:
      return 'element';
  }
}

function getPluralElementName(chartType: string): string {
  const single = getSingleElementName(chartType);
  if (single.endsWith('s')) return single;
  if (single === 'point') return 'points';
  return single + 's';
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}