function mySettings(props) {
  return (
    <Page>
      <TextImageRow
        label="Glance"
        sublabel="https://github.com/Rytiggy/Glance"
        icon="https://image.ibb.co/gbWF2H/twerp_bowtie_64.png"
      />
        <TextInput
          label="Api endpoint"
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
        label="Wunderground API Key"
        settingsKey="wuAPI"
        />
        <TextInput
        label="WU Station ID"
        settingsKey="StationID"
        />
        <TextInput
        label="AirNow API Key"
        settingsKey="anAPI"
        />
       <TextInput
        label="AirNow Zip Code"
        settingsKey="anZip"
        />
    </Page>
  );
}

registerSettingsPage(mySettings);