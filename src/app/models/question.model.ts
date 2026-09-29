export interface Question {
 id:number
 type:string
 question:string
 answers:{a:string,b:string,c:string,d:string}
 correct:'A'|'B'|'C'|'D'
 image?:string
}