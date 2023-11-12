import { Box, Table, TableBody, TableCell, TableHead, TableRow, styled } from '@mui/material';
import parse from 'html-react-parser';
import { replacePlainHTMLWithMuiComponents } from '../../Utils/Utils';
import ChartComponent from '../ChartComponent';
import AQIdatabase from '../../Utils/AirQualityIndexHelper';
import ThemePreferences from '../../Themes/ThemePreferences';

export const StyledTable = styled(Table)(({ theme, isTiny }) => ({
  minWidth: isTiny || 700,
  '& th, td': {
    fontSize: isTiny ? '0.625rem' : '0.6875rem',
    color: theme.palette.text.secondary,
    [theme.breakpoints.down('sm')]: {
      fontSize: isTiny ? '0.5rem' : '0.6875rem',
    },
  },
  '& th': {
    fontWeight: 500,
    color: theme.palette.text.primary,
    lineHeight: '1rem'
  }
}));

function AirQualityIndexTable(props) {
  const { isTiny, hideAQIDescription, themePreference } = props;

  const renderAQIchart = ({ shouldRender }) => {
    let aqiChart = null;

    if (shouldRender) {
      const dataArray = [['category'], ['US AQI']];
      for (let i = 0; i < AQIdatabase.length; i += 1) {
        dataArray[0].push(AQIdatabase[i].category);
        dataArray[1].push(
          Math.ceil((AQIdatabase[i].aqiUS.high - AQIdatabase[i].aqiUS.low) / 50) * 50
        );
      }

      aqiChart = (
        <ChartComponent
          chartHeight="4rem"
          chartData={
            {
              dataArray,
              chartType: 'BarChart',
              options: {
                enableInteractivity: false,
                legend: { position: 'none' },
                hAxis: {
                  ticks: [0, 50, 100, 150, 200, 300, 500]
                },
                chartArea:
                {
                  width: { portrait: '98%', landscape: '50%' },
                  height: { portrait: '20%', landscape: '30%' }
                },
                isStacked: true,
                colors: 'aqi',
                bar: { groupWidth: '100%' }
              }
            }
          }
        />
      );
    }

    return aqiChart;
  };

  return (
    <>
      <Box overflow="auto">
        <StyledTable size="small" isTiny={isTiny}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ pr: 0 }}>
                <Box sx={{ width: '1em', height: '1em' }} />
              </TableCell>
              <TableCell sx={{ pl: 1 }}>
                Category
              </TableCell>
              <TableCell align="right">US AQI</TableCell>
              <TableCell align="right">
                PM2.5 Concentration
                (µg/m
                <sup>3</sup>
                )
              </TableCell>
              {!hideAQIDescription && <TableCell align="left">Description</TableCell>}
              {!hideAQIDescription && <TableCell align="left">CITIESair&apos; Suggested Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {AQIdatabase.map((element, index) => (
              <TableRow
                key={index}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell sx={{ pr: 0 }}>
                  <Box sx={{ width: '1em', height: '1em', backgroundColor: themePreference === ThemePreferences.light ? element.lightThemeColor : element.darkThemeColor }} />
                </TableCell>
                <TableCell sx={{ pl: 1 }}>
                  {element.category}
                </TableCell>
                <TableCell align="right">
                  {element.aqiUS.low}
                  &nbsp;
                  -
                  &nbsp;
                  {element.aqiUS.high}
                </TableCell>
                <TableCell align="right">
                  {element.rawPM2_5.low}
                  &nbsp;
                  -
                  &nbsp;
                  {element.rawPM2_5.high}
                </TableCell>
                {!hideAQIDescription && <TableCell align="left">{element.description}</TableCell>}
                {!hideAQIDescription
                  && (
                    <TableCell align="left">
                      {
                        parse(element.healthSuggestions.outdoors, {
                          replace: replacePlainHTMLWithMuiComponents,
                        })
                      }
                    </TableCell>
                  )}
              </TableRow>
            ))}
          </TableBody>
        </StyledTable>
      </Box>
      {renderAQIchart({ shouldRender: !hideAQIDescription })}
    </>

  );
}

export default AirQualityIndexTable;
