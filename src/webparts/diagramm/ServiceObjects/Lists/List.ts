import DiagrammWebPart from "../../DiagrammWebPart";
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

export abstract class SPList {
    public static webpart: DiagrammWebPart;

    constructor(webpart: DiagrammWebPart) {
        if (webpart === undefined) {
            SPList.webpart = webpart;
        }
    }
    
     //Returns the ID of the first element of the list which corresponds to the parameters listname and label
    getID(url: string): Promise<number> {
    //const url: string = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${list}')/items?&$filter=(Listenname eq '${listName}') and (Label eq '${label}')`;

    return SPList.webpart.context.spHttpClient.get(url, SPHttpClient.configurations.v1)
    .then((response: SPHttpClientResponse) => {
      return response.json();
    }).then((list: any) => {
      console.log(list);
      return list.value[0].Id;
    }).catch(() => {
      throw Error('Getting Item Id Failed');
    })
    }

    //getListElement
    public static async getList(url: string): Promise<any> {
    //const url = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${name}')/items?$=filter=(Jahr eq ${year}) and (Monat eq ${month})`;

    return SPList.webpart.context.spHttpClient.get(url, SPHttpClient.configurations.v1)
      .then((response: SPHttpClientResponse) => {
        return response.json();
      }).then((list: any) => {
        return list;
      }).catch(() => {
        throw new Error;
      })
  }
}