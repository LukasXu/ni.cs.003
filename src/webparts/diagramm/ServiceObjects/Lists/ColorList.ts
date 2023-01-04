import DiagrammWebPart from "../../DiagrammWebPart";
import { SPList } from "./List";
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';


export class ColorList extends SPList {
    private listName: string;

    constructor(webpart: DiagrammWebPart, listName: string) {
        super(webpart);
        this.listName = listName;
    }

    //Updates the color value of the list elment in SP
    private updateColor(color: string, id: number): void {
        const url = `${SPList.webpart.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${this.listName}')/items(${id})`;
        let body = JSON.stringify({
            'Farbe': `${color}`
        });

        SPList.webpart.context.spHttpClient.post(
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

}