import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'

@Injectable({
  providedIn: 'root'
})
export class StorageService{

  store:any = {}

  constructor(private http:HttpClient){}

  async init(){

    const saved = localStorage.getItem('app-storage-osakidetza')

    if(saved){
      this.store = JSON.parse(saved)
      return
    }

    const general = await this.http
      .get('assets/data/general.json')
      .toPromise()

    const specific = await this.http
      .get('assets/data/specific.json')
      .toPromise()

    this.store.questions_general = general
    this.store.questions_specific = specific

    this.save()
  }

  save(){
    localStorage.setItem(
      'app-storage-osakidetza',
      JSON.stringify(this.store)
    )
  }

  async get(key:string){
    return this.store[key]
  }

  async set(key:string,value:any){
    this.store[key] = value
    this.save()
  }

  async remove(key: string) {
    delete this.store[key]
    this.save()
  }

}

export function initStorage(storage:StorageService){
  return () => storage.init()
}

