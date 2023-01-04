import DiagrammWebPart from "../Chart";
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { CurrentDate } from "../Utility/Date";


export interface ChartData {
  labels: string[],
  datasets: DatasetElement[],  
}

export interface DatasetElement {  
  label: string,
  backgroundColor: string,
  data: number[],
  stack: string,  
}

export default class JsonReader {
  private value: ChartData;
  private webpart: DiagrammWebPart;
  private json: any;

  constructor(webpart: DiagrammWebPart, jsonString: string) {
    this.webpart = webpart;
    this.json = JSON.parse(jsonString);
  }

  public async initData() {
    const labelLenght: number = this.json.label.length;
    const colorListName = this.json.colorlistname;
    const listElementArray = [];
    const barData: ChartData = {
      labels: [],
      datasets: [],      
    };    
    barData.labels = this.json.label; //sets index labels

    for (let i = 0; i < this.json.stacks.length; i ++) {
      const filterArray = this.json.stacks[i].filter;
      const listElement = (await this.getList(this.json.stacks[i].name, CurrentDate.getMonth(), CurrentDate.getYear(), filterArray)).value[0];
      listElementArray.push(listElement);
    }

    for (let i = 0; i < this.json.stacks.length; i++) {
      const listElement = listElementArray[i]; //list element
      const stackElementArray = this.json.stacks[i].data; // dataset element list
      const listName = this.json.stacks[i].name;
      for (let k = 0; k < stackElementArray.length; k++) {
        const element = stackElementArray[k]; // dataset element
        const label = element.label;
        const array = this.insert(labelLenght, listElement, element);  
        let colorElement = await this.getColorElement(colorListName, listName, label, this.json.colorfilter);
        let color; 

        if(colorElement === undefined) {
          const defaultColor = element.defaultcolor;
          color = (await this.createColorEntry(colorListName, listName, label, defaultColor)).Farbe;         
        } else {
          color = colorElement.Farbe;
        }
        
        const datasetElement: DatasetElement = {
          label: label,
          backgroundColor: color,
          data: array,
          stack: `Stack ${i}` ,
        }
        barData.datasets.push(datasetElement);
      }     
    }
    return barData;
  }

  private insert(labelLenght: number, listElement: any, element: any) {
    //pads array to fit label amount and inserts value at the right place
    const array: number[] = [];
    for (let j = 0; j < labelLenght; j++) {
      array.push(0);
    }
    const dataValue = listElement[element.id];
    array.splice(element.index, 0, dataValue);
    array.pop();
    return array;
  }

  //Returns the first element in the list that matches the parameters listname and label
  private async getColorElement(list: string, listName: string, label: string, filterArray: string[]) {
    const url: string = `${this.webpart.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${list}')/items?&$filter=(${filterArray[0]} eq '${listName}') and (${filterArray[1]} eq '${label}')`;
   
    return this.webpart.context.spHttpClient.get(url, SPHttpClient.configurations.v1)
    .then((response: SPHttpClientResponse) => {
      return response.json();
    }).then((list: any) => {
      return list.value[0];
    }).catch(() => {
      throw Error('');
    })
  }

  private getList(name: string, month: string, year: string, filterArray: string[]): Promise<any> {
    const url = `${this.webpart.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${name}')/items?$=filter=(${filterArray[0]} eq '${year}') and (${filterArray[1]} eq '${month}')`;

    return this.webpart.context.spHttpClient.get(url, SPHttpClient.configurations.v1)
      .then((response: SPHttpClientResponse) => {
        return response.json();
      }).then((list: any) => {
        if (list.value.length !== 0) {
          return list;
        } 
        return list;
      }).catch(() => {
        throw new Error;
      })
  }

  private async createColorEntry(list: string, listName: string, label: string, color: string) {
    const url = `${this.webpart.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${list}')/items`;
    const body: string = JSON.stringify({  
      'Listenname': listName,
      'Label': label,
      'Farbe': color,
    });

    return this.webpart.context.spHttpClient.post(
      url,
      SPHttpClient.configurations.v1,  
      {  
        headers: {  
          'Accept': 'application/json;odata=nometadata',  
          'Content-type': 'application/json;odata=nometadata',  
          'odata-version': ''  
        },  
        body: body  
      }
    ).then((response: SPHttpClientResponse) => {
      return response.json();
    }).then((response) => {
      return response;
    })
    .catch(() => {
      throw Error('Creating Item Failed');
    });
  }

  public getChartData(): ChartData {
    return this.value;
  }

  //Looks up the name of the list in the json at the given index
  public getListName(index: any): string {
    return this.json.stacks[index].name;
  }

  public getColorListName() {
    return this.json.colorlistname;
  }

  public getColorListFilter() {
    return this.json.colorfilter;
  }
}