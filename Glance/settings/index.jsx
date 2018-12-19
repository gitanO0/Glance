function mySettings(props) {
  return (
    <Page>
      <TextImageRow
        label="Glance"
        sublabel="https://github.com/Rytiggy/Glance"
        icon="https://image.ibb.co/gbWF2H/twerp_bowtie_64.png"
      />
        <TextInput
          label="xDrip Api endpoint"
          settingsKey="endpoint"
        />
        <TextInput
          label="High threshold"
          settingsKey="highThreshold"
        />
        <TextInput
        label="Low threshold"
        settingsKey="lowThreshold"
        />
        <Toggle
          label="24hr | 12hr"
          settingsKey="timeFormat"
        />
        <Toggle
          label="Fahrenheit | Celsius"
          settingsKey="tempType"
        />
        <TextInput
        label="Weather API Key"
        settingsKey="weatherAPIkey"
        />
        <TextInput
        label="Weather Location (Lat,Lon)"
        settingsKey="location"
        />
        <TextInput
        label="2nd Weather Location (Lat,Lon)"
        settingsKey="secondLocation"
        />
        <TextInput
        label="AirNow API Key"
        settingsKey="anAPI"
        />
       <TextInput
        label="AirNow Zip Code"
        settingsKey="anZip"
        />
        <TextInput
        label="USGS River Gauge ID"
        settingsKey="gaugeID"
        />    
        <TextInput
        label="Air & Water Temp Station"
        settingsKey="WaterTempStationID"
        />
        <TextInput
        label="Nightscout Site URL"
        settingsKey="NightscoutSiteURL"
        />
    </Page>
  );
}

registerSettingsPage(mySettings);