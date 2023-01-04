import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as strings from 'DiagrammWebPartStrings';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

import styles from './DiagrammWebPart.module.scss';
import JsonReader from './ServiceObjects/JsonReader';
import { CurrentDate } from './Utility/Date';

export interface PlanzahlenList {
  value: PlanzahlenElement[];
}

export interface PlanzahlenElement {
  Jahr: string,
  Monat: string,
  Umsatzgesamt: number,
  OData__x0056_K1: number,  //VK1
  OData__x0056_K4: number,  //VK4
  Farbe: string,
}

export interface IstzahlenList {
  value: IstzahlenElement[];
}

export interface IstzahlenElement {
  Jahr: string,
  Monat: string,
  Title: string,
  Id: number,
  Gesamtumsatz: number,
  Industrieverpackungen: number,
  Sonderprojekte: number,
  Lohnfertigung: number,
  Habitat: number,
  Material: number,
  Farbe: string,
}

export interface FarblisteElement {
  Listenname: string;
  Label: string;
  Farbe: string;
}

export interface IDiagrammWebPartProps {
  ColorListName: string;
  GroupName: string;
  JSONConfig: string;
}

export interface Date_GE {
  Month: string;
  Year: string;
}

const jsChart = require("jsChart");
let ob: any;

const istDefaultColor = "#5a58ce,#5a58ce,#5a58ce,#6f7ce2,#3841bc,#001a57";
const planDefaultColor = "#00ffaa,#00ffaa,#00ffaa";

export default class Chart extends BaseClientSideWebPart<IDiagrammWebPartProps> {

  private jsonReader: JsonReader;

  public render(): void {
    this.domElement.innerHTML = `
    <div id="main">
      <div>
        <canvas id="myChart"></canvas>
      </div>   
      <div id="chartSidebar">
        <div id="chartContent"></div>
      </div>
      <button id="refresh" class="${styles.rigthItem}">Refresh</button>
    </div> 
    `;
    this.renderChart();
    this.setEvents();
  }

  private async renderChart() {   
    const date = new CurrentDate();
    const titel = "Grafische Auswertung " + CurrentDate.getMonth() + " " + CurrentDate.getYear();    
    const jsonString = this.properties.JSONConfig;
    this.jsonReader = new JsonReader(this, jsonString);
    const data = await this.jsonReader.initData();

    if (ob !== undefined) {
      ob.destroy();
    } 
    const element = document.getElementById("myChart");
    const chart = new jsChart(element, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: titel, 
          },
        },
        title: {
          display: true,
          text: titel, 
        },
        scales: {
          x: {            
            stacked: true,
          },
          y: {
            stacked: true
          }
        }
      },
    })
    ob = chart; 
  }

  private setEvents(): void {
    document.getElementById("myChart").addEventListener(('click'), (e) => { this.renderSidebar(e); });
    document.getElementById("refresh").addEventListener(('click'), () => { this.renderChart() });
  }

  private renderSidebar(e: Event): void {
    const chartObject: any = ob.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
    const index = chartObject[0]._datasetIndex;
    const color: any = ob.data.datasets[index].backgroundColor;

    console.log(chartObject);
  
    const sidebar = this.domElement.querySelector('#chartContent');
    const chartHTML = `
    <h2>Change Color</h2>
    <input id="chartObjectColor" type="color" value='${color}'/>
    <button id="saveColor">Save</button>
    <div id="errorOnColorButton"></div>
    `;
    sidebar.innerHTML = chartHTML
    document.getElementById("chartObjectColor").addEventListener(("input"), () => { this.changeColor(index); });
    document.getElementById("saveColor").addEventListener(("click"), () => { this.saveColor(index); })
  }

  private changeColor(index: number): void {
    const colorValue = (<HTMLInputElement>document.getElementById("chartObjectColor")).value;
    ob.data.datasets[index].backgroundColor = colorValue;
    ob.update();
  }

  private async saveColor(dataSetIndex: number) {
    const inGroup = await this.checkGroupPermission();
    if (inGroup === false) {
      const htmlElement = this.domElement.querySelector('#errorOnColorButton');
      htmlElement.innerHTML = "Changing Color requires Authorisation";
      return;
    }
    const colorValue = (<HTMLInputElement>document.getElementById("chartObjectColor")).value;
    const label = ob.data.datasets[dataSetIndex].label;
    const stackString = ob.data.datasets[dataSetIndex].stack;  
    const stackIndex = stackString.split(" ")[1];
    let listName = this.jsonReader.getListName(stackIndex);
    const id = await this.getID(this.jsonReader.getColorListName() ,listName, label, this.jsonReader.getColorListFilter());
  
    this.updateColor(colorValue, id);
  }


  //Updates the color value of the list elment in SP
  private updateColor(color: string, id: number): void {
    const url = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${this.properties.ColorListName}')/items(${id})`;
    let body = JSON.stringify({
      'Farbe': `${color}`
    });
    
    this.context.spHttpClient.post(
      url,
      SPHttpClient.configurations.v1,
      {
        headers: {
          'Accept': 'application/json;odata=nometadata',
          'Content-type': 'application/json;odata=nometadata',
          'odata-version': '',
          'IF-MATCH': '*',
          'X-HTTP-Method': 'MERGE'
        },
        body: body
      }
    ).then(() => {
      console.log("color changed");
    }).catch(() => {
      console.log("Update Color Failed");
    })
  }

  //Returns the ID of the first element of the list which corresponds to the parameters listname and label
  private getID(list:string, listName: string, label: string, filterArray: string[]): Promise<number> {
    const url: string = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${list}')/items?&$filter=(${filterArray[0]} eq '${listName}') and (${filterArray[1]} eq '${label}')`;

    return this.context.spHttpClient.get(url, SPHttpClient.configurations.v1)
    .then((response: SPHttpClientResponse) => {
      return response.json();
    }).then((list: any) => {
      console.log(list);
      return list.value[0].Id;
    }).catch(() => {
      throw Error('Getting Item Id Failed');
    })
  }

  private async checkGroupPermission() {
    const groups = await this.getGroups();
    const groupName = this.properties.GroupName;
    let result = false;

    groups.forEach((siteGroup: any) => {
      if (siteGroup.Title === groupName) {      
        result = true;
      }
    });  
    return result;
  }

  private getGroups(): Promise<any> {
    const url = `${this.context.pageContext.site.absoluteUrl}/_api/web/currentuser/groups`;
    return this.context.spHttpClient.get(url, SPHttpClient.configurations.v1).then((response: SPHttpClientResponse) => {
      return response.json();
    }).then((listElement: any) => {
      return listElement.value;
    }).catch(() => {
      throw new Error;
    });
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('GroupName', {
                  label: "GroupName",
                }),
                PropertyPaneTextField('JSONConfig', {
                  label: "JSON-Config",
                  multiline: true,
                  resizable: true,
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
