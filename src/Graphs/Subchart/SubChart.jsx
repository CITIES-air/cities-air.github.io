/* eslint-disable */

import { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { GoogleContext } from '../../ContextProviders/GoogleContext';

import { Alert, Box, Grid, Slider, Stack } from '@mui/material/';

import { useTheme } from '@mui/material/styles';
import SeriesSelector from './SubchartUtils/SeriesSelector';
import { generateRandomID, returnGenericOptions, returnCalendarChartOptions, returnChartControlUI, ChartControlType, addTouchEventListenerForChartControl, getDateRangeForCalendarChart, getValueRangeForCalendarChart } from '../GoogleChartHelper';

import GoogleChartStyleWrapper from './SubchartUtils/GoogleChartStyleWrapper';

import LoadingAnimation from '../../Components/LoadingAnimation';

import { CalendarChart, getCalendarChartMargin, calculateCalendarChartHeight } from './NivoCharts/NivoCalendarChart'
import { generateSvgFillGradient, BackgroundGradient } from '../../Utils/Gradient/GradientUtils';

import CustomDateRangePicker from '../../Components/DateRangePicker/CustomDateRangePicker'
import { isValidArray } from '../../Utils/Utils';
import { useYearRange } from '../../ContextProviders/YearRangeContext';

const NoChartToRender = ({ dataType }) => {
  return (
    <Alert severity="error" sx={{ my: 2 }}>
      This sensor does not have&nbsp;
      <Box component="span" textTransform="capitalize">
        {dataType}
      </Box>
      &nbsp;data
    </Alert>
  )
}

export default function SubChart(props) {
  // Props
  const { chartData, subchartIndex, windowSize, isPortrait, isHomepage, height, maxHeight, selectedDataType, currentSubchart } = props;

  // Formulate the className
  const className = chartData.customClassName ? `${chartData.chartType} ${chartData.customClassName}` : chartData.chartType;

  // Use GoogleContext for loading and manipulating the Google Charts
  const google = useContext(GoogleContext);

  // States of the Google Charts
  const [dataTable, setDataTable] = useState();
  const [chartWrapper, setChartWrapper] = useState();
  const [dashboardWrapper, setDashboardWrapper] = useState();
  const [controlWrapper, setControlWrapper] = useState();

  const [previousChartData, setPreviousChartData] = useState();

  // Get the current theme
  const theme = useTheme();

  // To determine the first time the chart renders to show/hide the LoadingAnimation
  const [isFirstRender, setIsFirstRender] = useState(true);

  // To determine if the charts should be rendered or not
  const [shouldRenderChart, setShouldRenderChart] = useState(true);

  // Keep track of the columns (series) of the chart
  const [allInitialColumns, setAllInitialColumns] = useState();
  const [dataColumns, setDataColumns] = useState();
  const [initialVAxisRange, setInitialVAxisRage] = useState();

  // Define the DOM container's ID for drawing the google chart inside
  const [chartID, __] = useState(generateRandomID());

  // Calendar chart's properties
  const [chartTotalHeight, setChartTotalHeight] = useState(200);

  // Get the options object for chart
  let options = useMemo(() => {
    let opts = returnGenericOptions({ ...props, theme });
    if (chartData.chartType === 'Calendar') {
      opts = returnCalendarChartOptions(opts);
    }
    return opts;
  }, [props, theme, chartData.chartType]);
  // State to store transformed data for CalendarChart
  const [calendarData, setCalendarData] = useState(null);
  const { yearRange, setYearRange } = useYearRange();
  const [calendarHeight, setCalendarHeight] = useState(200);
  const [containerWidth, setContainerWidth] = useState(1200); // max width of the chart container
  const [shouldDisplaySlider, setshouldDisplaySlider] = useState(false);
  const calendarRef = useRef(null);
  // Early exit for 'Calendar' chartType
  if (chartData.chartType === 'Calendar') {
    useEffect(() => {
      const dataArray = chartData.dataArray
        || (chartData.subcharts
          && chartData.subcharts[subchartIndex].dataArray)
        || null
        || null;

      if (!isValidArray(dataArray)) {
        setShouldRenderChart(false);
        return; // early return if there is no data to render
      }

      const dateStrings = dataArray.map(item => item.day);
      const values = dataArray.map(item => item.value);
      const dateRange = getDateRangeForCalendarChart(dateStrings);

      setCalendarData({
        data: dataArray,
        dateRange: dateRange,
        valueRange: getValueRangeForCalendarChart(values)
      });

      // Get the number of years to display
      const endYear = new Date(dateRange.max).getFullYear();
      const startYear = isPortrait ? endYear - 3 : endYear - 2;

      setYearRange([startYear, endYear]);

      setshouldDisplaySlider((new Date(dateRange.min).getFullYear() <= endYear - 2));
      setShouldRenderChart(true);
    }, [chartData]);

    // Generate marks for the slider
    const marks = Array.from(
      { length: yearRange[1] - yearRange[0] + 1 },
      (_, i) => ({ value: yearRange[0] + i, label: yearRange[0] + i })
    );

    // Detect and display the current subchart
    // Not used here, but kept for reference. Feel free to remove
    // useEffect(() => {
    //   console.log('current subchart: ', currentSubchart);
    //   console.log(calendarData);
    // }, [currentSubchart]);

    // Effect to adjust the height based on the yearRange
    useEffect(() => {
      if (calendarData) {
        const calendarChartMargin = getCalendarChartMargin(isPortrait);
        const cellSize = Math.min(containerWidth / 60, 20); // max cell size of 20
        const yearHeight = cellSize * 7; // Height for one year

        const totalHeight = calculateCalendarChartHeight(yearRange, yearHeight, calendarChartMargin);
        setCalendarHeight(totalHeight);

        if (calendarRef.current) {
          let element = calendarRef.current; // Start with the current ref

          // Search for the highest MuiBox-root that has a MuiTabs-root sibling
          let targetElement = null;

          while (element) {
            // Check if this element is a MuiBox-root
            if (element.classList.contains('MuiBox-root')) {
              // Check if any sibling is a MuiTabs-root
              let sibling = element.parentElement.firstChild;
              while (sibling) {
                if (sibling !== element && sibling.classList.contains('MuiTabs-root')) {
                  targetElement = element; // Found the target element
                  break;
                }
                sibling = sibling.nextSibling;
              }
            }

            if (targetElement) break; // Stop if we've found our target
            element = element.parentElement; // Continue searching upwards
          }

          if (targetElement) {
            // targetElement.style.border = "2px solid red";
            targetElement.style.height = `${totalHeight + 125}px`
          }
        }
      }
    }, [yearRange, isPortrait]);

    if (!calendarData) {
      return (
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <LoadingAnimation />
        </Box>
      )
    }

    return (
      shouldRenderChart ? (
        <>
          {shouldDisplaySlider && (
            <Box
              ref={calendarRef}
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                mt: isPortrait ? 1 : 2,
                mb: isPortrait ? 3 : 4,
              }}>
              <Slider
                value={yearRange}
                min={new Date(calendarData.dateRange.min).getFullYear()}
                max={new Date(calendarData.dateRange.max).getFullYear()}
                onChange={(event, newValue) => setYearRange(newValue)}
                valueLabelDisplay="off"
                aria-labelledby="calendar-chart-year-slider"
                marks={marks}
                size='small'
                sx={{ width: '75%' }}
              />
            </Box>
          )}
          <GoogleChartStyleWrapper
            isPortrait={isPortrait}
            className={className}
            position="relative"
            minWidth="700px"
            height={calendarHeight + 'px'}
            minHeight={isPortrait ? '200px' : calendarHeight + 'px'}
            maxHeight={isPortrait && '550px'}
          >
            <CalendarChart
              data={calendarData.data}
              dateRange={calendarData.dateRange}
              valueRange={calendarData.valueRange}
              yearRange={shouldDisplaySlider ? yearRange : [new Date(calendarData.dateRange.min), new Date(calendarData.dateRange.max)]}
              isPortrait={isPortrait}
              options={options}
            />
          </GoogleChartStyleWrapper>
        </>
      ) : <NoChartToRender dataType={selectedDataType} />
    );
  }

  // Properties for chart control (if existed)
  let hasChartControl = false;
  let chartControlOptions;
  // Only show the chart control if:
  // It exists in the database (either for all subcharts or just for a particular subchart)
  // And if the chart is currently not shown on homePage
  let chartControl = chartData.control || chartData.subcharts?.[subchartIndex].control;
  if (chartControl && (isHomepage !== true)) {
    hasChartControl = true;

    // Get the options for chartControl if hasChartControl
    chartControlOptions = {
      ...chartControl.options,
      ui: returnChartControlUI({
        chartControl,
        mainChartData: chartData,
        mainChartOptions: options,
        subchartIndex,
        theme,
        isPortrait
      })
    };

    // Swap touch events for mouse events on ChartRangeControl
    // as it doesn't support touch events on mobile
    if (chartControl.controlType === 'ChartRangeFilter') {
      useEffect(() => {
        const cleanupTouchEventListener = addTouchEventListenerForChartControl({ controlWrapper, chartID });
        return cleanupTouchEventListener;
      }, [controlWrapper]);
    }
  }

  // Properties for selecting (showing or hiding) the serie(s)
  const seriesSelector = options.seriesSelector || false;

  // Properties for date-range-picker
  const dateRangePicker = options.dateRangePicker || null;

  // Set new options prop and re-render the chart if theme or isPortrait changes
  useEffect(() => {
    if (seriesSelector) handleSeriesSelection({ newDataColumns: dataColumns }); // this function set new options, too
    else {
      chartWrapper?.setOptions({
        ...options,
        ...(chartData.chartType === 'Calendar' && { height: chartTotalHeight })
      });

      chartWrapper?.draw();
      if (hasChartControl) {
        controlWrapper?.setOptions(chartControlOptions);
        controlWrapper?.draw();
      }
    }
  }, [theme, isPortrait, windowSize, chartTotalHeight]);

  // Set new initialColumnsColors if the theme changes
  // This only applies to when seriesSelector.method == "setViewColumn"
  useEffect(() => {
    if (!dataColumns) return;
    if (seriesSelector && seriesSelector.method == "setViewColumn") {
      setInitialColumnsColors({ dataColumns: dataColumns });
      handleSeriesSelection({ newDataColumns: dataColumns });
    }
  }, [theme]);

  const getInitialColumns = ({ chartWrapper, dataTable, seriesSelector }) => {
    // Update the initial DataView's columns (often, all of the series are displayed initially)
    var initialView = chartWrapper.getView();
    // If (optional) columns is not specified in database
    // Assign it from DataTable
    if (initialView.columns == null) {
      const viewFromDataTable = new google.visualization.DataView(dataTable);
      chartWrapper.setView({
        columns: viewFromDataTable.columns
      });
      initialView = chartWrapper.getView();
    }

    let shouldAssignDomainRoleToFistColumn = true; // variable to only assign type: 'domain' to the very first column
    let dataSeriesIndex = 0;
    const allInitialColumns = initialView.columns.map((col, index) => {
      // A column can either be a number (that denotes the index of the sourceColumn) or an object
      // The code below harmonize all columns to be an object to store crucial data to toggle their visibility
      if (typeof col === 'number') col = {
        role: shouldAssignDomainRoleToFistColumn ? 'domain' : 'data',
        sourceColumn: col
      }
      col.label = dataTable.getColumnLabel(col.sourceColumn);
      col.indexInAllInitialColumns = index;

      shouldAssignDomainRoleToFistColumn = shouldAssignDomainRoleToFistColumn && false;

      // Set the visibility of data column, 
      if (col.role === 'data') {
        // If defaultSeriesToDisplayInitially is presented
        // then, only show these series
        if (seriesSelector.defaultSeriesToDisplayInitially) {
          if (seriesSelector.defaultSeriesToDisplayInitially.includes(index)) {
            col.selected = true;
          }
          else {
            col.selected = false;
          }
        }
        // If no defaultSeriesToDisplayInitially is presented
        else {
          // then, all data columns are selected if multiple series are selectable
          if (seriesSelector.allowMultiple) {
            col.selected = true;
          } else {
            // else for single serie selector, only first data column is selected
            if (dataSeriesIndex === 0) {
              col.selected = true;
            } else {
              col.selected = false;
            }
          }
        }

        col.seriesIndex = dataSeriesIndex;
        dataSeriesIndex++;
      }
      return col;
    });
    setAllInitialColumns(allInitialColumns);
    const initialVAxisRange = getInitialVAxisRange({ dataTable: dataTable, allInitialColumns: allInitialColumns });
    setInitialVAxisRage(initialVAxisRange);
    // To track selection, only get the columns that are:
    // role === 'data'
    // visibleInLegend !== false
    const dataColumns = allInitialColumns.filter((col) => {
      return col.role === 'data' && options.series?.[col.seriesIndex]?.visibleInLegend !== false;
    });

    if (seriesSelector.method === "setViewColumn") setInitialColumnsColors({ dataColumns: dataColumns });

    setDataColumns(dataColumns);
    return { initAllInitialColumns: allInitialColumns, initDataColumns: dataColumns };
  };

  const setInitialColumnsColors = ({ dataColumns }) => {
    dataColumns.forEach((col) => {
      // Assign inherit color to this data column
      col.color = options.colors[col.seriesIndex % options.colors.length];
      // Assign other inherit attributes from its serie object (if existed)
      col.serieAttribute = options.series?.[col.seriesIndex];
    });
  }

  const getInitialVAxisRange = ({ dataTable, allInitialColumns }) => {
    let vAxisMin, vAxisMax;
    allInitialColumns.forEach((col, index) => {
      if (index === 0) return; // the first column is the domain (hAxis)
      const range = dataTable.getColumnRange(col.sourceColumn);
      if (!isNaN(range.min) && range.min) vAxisMin = vAxisMin ? Math.min(vAxisMin, range.min) : range.min;
      if (!isNaN(range.max) && range.max) vAxisMax = vAxisMax ? Math.max(vAxisMax, range.max) : range.max;
    });
    return { min: vAxisMin, max: vAxisMax };
  }

  const handleSeriesSelection = ({
    newDataColumns,
    _allInitialColumns = allInitialColumns,
    _chartWrapper = chartWrapper,
    _controlWrapper = controlWrapper
  }) => {
    if (!_allInitialColumns) return;

    setDataColumns(newDataColumns);

    if (seriesSelector.method === "toggleVisibility" || seriesSelector.method === null) {
      const hiddenSeriesObject = {};
      newDataColumns.forEach((col) => {
        if (!col.selected)
          hiddenSeriesObject[col.seriesIndex] = {
            color: 'transparent',
            enableInteractivity: false,
            visibleInLegend: false
          }; // 'hide' the serie by making it transparent
      });

      _chartWrapper?.setOptions({
        ...options,
        series: {
          ...options.series,
          ...hiddenSeriesObject
        }
      });

      if (hasChartControl) {
        const currentControlOptions = _controlWrapper?.getOptions();
        _controlWrapper?.setOptions({
          ...currentControlOptions,
          ui: {
            ...currentControlOptions.ui,
            chartOptions: {
              ...currentControlOptions.ui.chartOptions,
              series: {
                ...options.series,
                ...hiddenSeriesObject
              }
            }
          }
        });
      }
    }
    else if (seriesSelector.method === "setViewColumn") {
      let newViewColumns = [];
      newViewColumns.push(0); // this is the domain column
      newDataColumns.forEach((dataColumn) => {
        if (dataColumn.selected) {
          newViewColumns.push(dataColumn);
          // Find this dataColumn's supporting columns (whose role !== 'data')
          // A dataColumn has its supporting columns (can be many) follow it immediately
          for (let i = dataColumn.indexIn_ + 1; i < _allInitialColumns.length; i++) {
            if (_allInitialColumns[i].role !== 'data') {
              newViewColumns.push(_allInitialColumns[i]);
            }
            // If this loop encounter the next dataColumn, break the loop, all supporting columns for this dataColumn have been discovered
            else {
              break;
            }
          }
        }
      });
      _chartWrapper?.setView({ columns: newViewColumns });

      const newOptions = { ...options };
      // Preserve the initial vAxis range so that the vAxis doesn't shift based on the visible serie(s)
      // newOptions.vAxis.viewWindow = {
      //   min: (options.vAxis.viewWindow.min == null) ? initialVAxisRange.min : options.vAxis.viewWindow.min,
      //   max: (options.vAxis.viewWindow.max == null) ? initialVAxisRange.max : options.vAxis.viewWindow.max,
      // }
      // Set the new color array
      newOptions.colors = newDataColumns.filter((col) => col.selected).map((col) => col.color);
      // Set the new series object (if any)
      // this contains other series' attributes (lineWidth, seriesType...)
      const series = {};
      let selectedSeriesCount = 0;
      newDataColumns.forEach((col) => {
        if (!col.selected) return;
        if (col.serieAttribute != null) {
          series[selectedSeriesCount] = col.serieAttribute;
        }
        selectedSeriesCount++;
      })
      newOptions.series = series;
      _chartWrapper?.setOptions(newOptions);

      if (hasChartControl) {
        const currentControlOptions = _controlWrapper?.getOptions();
        _controlWrapper?.setOptions({
          ...currentControlOptions,
          ui: {
            ...currentControlOptions.ui,
            chartOptions: {
              ...currentControlOptions.ui.chartOptions,
              colors: newOptions.colors,
              series: newOptions.series
            },
            chartView: {
              columns: newViewColumns
            }
          }
        });
      }
    }

    // Call draw to apply the new DataView and 'refresh' the chart
    _chartWrapper?.draw();

    if (hasChartControl) {
      _controlWrapper?.draw();
    }
  };

  const reconstructFunctionFromJSONstring = (columns) => {
    if (!columns) return;

    const evaluatedColumns = [];
    for (const column of columns) {
      if (typeof column === 'number') {
        // If it's a number, add it as-is
        evaluatedColumns.push(column);
      } else if (typeof column === 'object') {
        if (column.calc && column.calc !== 'stringify') {
          // If it's an object with a 'calc' property, evaluate the 'calc' function
          // using new Function() and add the result to the evaluatedColumns array
          const calcFunction = new Function("dataTable", "rowNum", column.calc);
          evaluatedColumns.push({
            ...column,
            calc: calcFunction,
          });
        } else {
          // If it's an object without a 'calc' property, or with calc = 'stringify', add it as-is
          evaluatedColumns.push(column);
        }
      }
    }
    return evaluatedColumns;
  }


  // Call this function to fetch the data and draw the initial chart
  useEffect(() => {
    if (google && chartData) {
      // Do not draw again if deep comparison between current chartData and previousChartData is true
      if (JSON.stringify(chartData) === JSON.stringify(previousChartData)) return;
      setPreviousChartData(chartData);

      // Get and set the dataArray 
      const dataArray = chartData.dataArray
        || (chartData.subcharts
          && chartData.subcharts[subchartIndex].dataArray)
        || null
        || null;

      if (!isValidArray(dataArray)) {
        setShouldRenderChart(false);
        return; // early return if there is no data to render
      }

      const thisDataTable = google.visualization.arrayToDataTable(dataArray);
      setDataTable(thisDataTable);

      // Get dataColumn views
      const columns = chartData.columns
        || (chartData.subcharts
          && chartData.subcharts[subchartIndex].columns)
        || null
        || null;
      const reconstructedColumns = reconstructFunctionFromJSONstring(columns);

      // Create chartWrapper
      const thisChartWrapper = new google.visualization.ChartWrapper({
        chartType: chartData.chartType,
        dataTable: (!hasChartControl) ? thisDataTable : undefined,
        options: options,
        view: {
          columns: reconstructedColumns
        },
        containerId: chartID
      });
      setChartWrapper(thisChartWrapper);

      let thisControlWrapper;
      if (hasChartControl) {
        const thisDashboardWrapper = new google.visualization.Dashboard(
          document.getElementById(`dashboard-${chartID}`));
        setDashboardWrapper(thisDashboardWrapper);

        google.visualization.events.addListener(thisDashboardWrapper, 'ready', onChartReady);

        thisControlWrapper = new google.visualization.ControlWrapper({
          controlType: chartControl.controlType,
          options: chartControlOptions,
          containerId: `control-${chartID}`
        });
        setControlWrapper(thisControlWrapper);

        // Establish dependencies
        thisDashboardWrapper.bind(thisControlWrapper, thisChartWrapper);

        thisDashboardWrapper.draw(thisDataTable);
      }
      else {
        google.visualization.events.addListener(thisChartWrapper, 'ready', onChartReady);
        thisChartWrapper.draw();
      }

      // Run the seriesSelector for the first time
      if (seriesSelector) {
        const { initAllInitialColumns, initDataColumns } = getInitialColumns({ chartWrapper: thisChartWrapper, dataTable: thisDataTable, seriesSelector: seriesSelector });

        handleSeriesSelection({
          _allInitialColumns: initAllInitialColumns,
          newDataColumns: initDataColumns,
          _chartWrapper: thisChartWrapper,
          _controlWrapper: thisControlWrapper
        });
      }

      // Set shouldRenderChart finally
      setShouldRenderChart(true);
    }
  }, [google, chartData]);

  const renderChart = () => {
    if (hasChartControl) {
      return (
        <Stack
          id={`dashboard-${chartID}`}
          direction={ChartControlType[chartControl.controlType]?.stackDirection || 'column-reverse'}
          sx={{ height: '100%' }}
        >
          <Box
            id={`control-${chartID}`}
            sx={{
              height: `calc(${height} / 8)`,
              opacity: 0.8,
              filter: 'saturate(0.3)'
            }}
          />
          <Box id={chartID} sx={{ height: height, maxHeight: maxHeight }} />
        </Stack>
      )
    }
    else return <Box id={chartID} sx={{ height: height, maxHeight: maxHeight }} />;
  }

  const gradientBackground = options.backgroundColor?.fill !== "aqi";
  const gradientBackgroundId = `${chartID}-backgroundGradient`;
  const svgFillGradient = generateSvgFillGradient({
    colors: theme.palette.chart.colorAxes.aqi.colors,
    optionalMinValue: options.vAxis?.viewWindow?.min,
    optionalMaxValue: options.vAxis?.viewWindow?.max
  });

  const onChartReady = () => {
    if (!isFirstRender) return;
    // Hide the circleProgress when chart finishes rendering the first time
    setIsFirstRender(false);
  };

  const showAuxiliaryControls = () => {
    if (!isFirstRender) {
      return (
        <Grid
          container
          mt={1}
          sx={{
            gap: 2,
            [theme.breakpoints.down('sm')]: { gap: 1 }
          }}
        >
          {seriesSelector &&
            <Grid item
              sx={{
                [theme.breakpoints.down('sm')]: { width: '100%' }
              }}
            >
              <SeriesSelector
                items={dataColumns}
                allowMultiple={seriesSelector.allowMultiple}
                seriesLabel={seriesSelector.seriesLabel}
                selectorID={`${chartData.title}-selector`}
                onSeriesSelection={handleSeriesSelection}
                displayChip={false}
              />
            </Grid>
          }
          {
            dateRangePicker &&
            <Grid item
              sx={{
                height: "2rem",
                width: { [theme.breakpoints.down('sm')]: { width: '100%' } }
              }} >
              <CustomDateRangePicker minDateOfDataset={new Date(dateRangePicker.minDate)} />
            </Grid>
          }
        </Grid >
      );
    } else {
      return null;
    }
  };

  return (
    shouldRenderChart ?
      <GoogleChartStyleWrapper
        isPortrait={isPortrait}
        gradientBackgroundId={gradientBackgroundId}
        className={className}
        position="relative"
        height="100%"
        minHeight={chartData.chartType === 'Calendar' && '200px'}
      >
        {/* Conditionally display loading animation here */}
        {isFirstRender && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <LoadingAnimation />
          </Box>
        )}
        {showAuxiliaryControls()}
        {renderChart()}
        {gradientBackground ? <BackgroundGradient id={gradientBackgroundId} colors={svgFillGradient} /> : null}
      </GoogleChartStyleWrapper>
      : <NoChartToRender dataType={selectedDataType} />
  );
}