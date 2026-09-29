import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatsService } from '../services/stats.service';
import { QuestionService } from '../services/question.service';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonBadge, IonList, IonListHeader, IonItem, IonLabel,
  IonCard, IonCardContent, IonGrid, IonRow, IonCol,
  IonNote, IonButton, IonIcon, IonCheckbox, IonCardHeader, IonCardTitle, IonChip,
  IonAccordion, IonAccordionGroup, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { arrowBack, arrowForward} from 'ionicons/icons';
import { addIcons } from 'ionicons';


@Component({
  selector: 'app-hoy',
  templateUrl: './hoy.page.html',
  styleUrls: ['./hoy.page.scss'],
  standalone: true,
  imports: [IonSegmentButton, IonSegment, IonChip, IonAccordion, IonAccordionGroup, IonCardTitle, IonCardHeader, 
    IonIcon, IonButton, IonContent, IonHeader, IonTitle, IonToolbar,
    IonBadge, IonList, IonItem, IonLabel, IonCheckbox,
    CommonModule, FormsModule, DatePipe,
    IonNote, IonCol, IonRow, IonGrid, IonCardContent, IonCard, IonListHeader, IonCardHeader,
IonCardTitle,
  ]
})
export class HoyPage implements OnInit {

  today = new Date()
  resumen: any = { total: 0, correctas: 0, incorrectas: 0, pctAciertos: 0, pctFallos: 0 }
  fallosHoy: any[] = []
  questionsMap: Map<string, any> = new Map()

  calYear = new Date().getFullYear()
  calMonth = new Date().getMonth()
  calDias: ({ date: Date, activo: boolean } | null)[][] = []
  diasConActividad = new Set<string>()
  diaSeleccionado: Date | null = null
  resumenDia: any = { total: 0, correctas: 0, incorrectas: 0, pctAciertos: 0, pctFallos: 0 }
  fallosDia: any[] = []
  mostrarHistorico = false
  seleccionarTodas = false;
  seleccionarTodasPendientes = false;

  readonly DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  readonly MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
                    'Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  pendientesDia: any[] = [];

  readonly blockSize = 50
  blockGroups: { type: string, blocks: { start: number, end: number }[] }[] = []

  constructor(
    private statsService: StatsService,
    private questionService: QuestionService,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({
          arrowBack, arrowForward
        });
  }

  async ngOnInit() {
    await this.load()
  }

  async ionViewWillEnter() {
    await this.load()
  }

  async load() {
    this.resumen = await this.statsService.getResumenHoy()
    const fallos = await this.statsService.getFallosHoy()
    const allQuestions = await this.questionService.getCombined()

    allQuestions.forEach((q: any) => {
      this.questionsMap.set(`${q.id}_${q.type}`, q)
    })

    this.fallosHoy = fallos.map((f: any) => {
      const q = this.questionsMap.get(`${f.id}_${f.type}`)
      return { ...f, question: q?.question || '—', categoria: f.type }
    })

    this.diasConActividad = await this.statsService.getDiasConActividad()
    this.buildCalendar()
  }

  buildCalendar() {
    const firstDay = new Date(this.calYear, this.calMonth, 1)
    const lastDay = new Date(this.calYear, this.calMonth + 1, 0)

    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const weeks: ({ date: Date, activo: boolean } | null)[][] = []
    let week: ({ date: Date, activo: boolean } | null)[] = []

    for (let i = 0; i < startDow; i++) week.push(null)

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(this.calYear, this.calMonth, d)
      week.push({ date, activo: this.diasConActividad.has(date.toDateString()) })
      if (week.length === 7) { weeks.push(week); week = [] }
    }

    if (week.length) {
      while (week.length < 7) week.push(null)
      weeks.push(week)
    }

    this.calDias = weeks
  }

  prevMes() {
    if (this.calMonth === 0) { this.calMonth = 11; this.calYear-- }
    else this.calMonth--
    this.buildCalendar()
  }

  nextMes() {
    if (this.calMonth === 11) { this.calMonth = 0; this.calYear++ }
    else this.calMonth++
    this.buildCalendar()
  }

  async seleccionarDia(dia: { date: Date, activo: boolean }) {

    if (!dia) return;

    this.diaSeleccionado = dia.date;
    this.mostrarHistorico = true;

    this.resumenDia =
      await this.statsService.getResumenDia(dia.date);

    const fallos =
      await this.statsService.getFallosDia(dia.date);

    const allQuestions =
      await this.questionService.getCombined();

    const map = new Map();

    allQuestions.forEach((q: any) => {
      map.set(`${q.id}_${q.type}`, q);
    });

    this.fallosDia = fallos.map((f: any) => {
      const q = map.get(`${f.id}_${f.type}`);

      return {
        ...f,
        question: q?.question || '—',
        categoria: f.type,
        selectedPending: false
      };
    });

    const respondidas =
      await this.statsService.getRespondidasDia(dia.date);

    this.pendientesDia = allQuestions
      .filter(q => !respondidas.has(`${q.id}_${q.type}`))
      .map(q => ({
        id: q.id,
        categoria: q.type,
        question: q.question,
        selectedPending: false
      }));

    this.seleccionarTodasPendientes = false
    this.buildBlocks(allQuestions)
  }

  private buildBlocks(allQuestions: any[]) {
    const maxByType = new Map<string, number>()
    allQuestions.forEach((q: any) => {
      maxByType.set(q.type, Math.max(maxByType.get(q.type) || 0, q.id))
    })
    this.blockGroups = [...maxByType.entries()].map(([type, max]) => ({
      type,
      blocks: Array.from({ length: Math.ceil(max / this.blockSize) }, (_, i) => ({
        start: i * this.blockSize + 1,
        end: Math.min((i + 1) * this.blockSize, max)
      }))
    }))
  }

  private pendientesEnBloque(type: string, start: number, end: number) {
    return this.pendientesDia.filter(
      p => p.categoria === type && p.id >= start && p.id <= end
    )
  }

  /** 'all' | 'some' | 'none' | 'empty' (sin pendientes en el bloque) */
  blockState(type: string, start: number, end: number) {
    const items = this.pendientesEnBloque(type, start, end)
    if (items.length === 0) return 'empty'
    const n = items.filter(p => p.selectedPending).length
    if (n === 0) return 'none'
    return n === items.length ? 'all' : 'some'
  }

  toggleBlock(type: string, start: number, end: number) {
    const state = this.blockState(type, start, end)
    if (state === 'empty') return
    this.pendientesEnBloque(type, start, end)
      .forEach(p => p.selectedPending = state !== 'all')
    this.seleccionarTodasPendientes =
      this.pendientesDia.length > 0 && this.pendientesDia.every(p => p.selectedPending)
  }

  get fallosSeleccionados(): number {
    return this.fallosDia.filter(f => f.selectedPending).length
  }

  async generateQuiz() {
    const selectedFallos = this.fallosDia
      .filter(f => f.selectedPending)
      .map(f => ({
        id: f.id,
        type: f.type
      }));

    const selectedPendientes = this.pendientesDia
      .filter(p => p.selectedPending)
      .map(p => ({
        id: p.id,
        type: p.categoria
      }));

    const selected = [
      ...selectedFallos,
      ...selectedPendientes
    ];

    if (selected.length === 0) {
      const alert = await this.alertController.create({
        header: 'Aviso',
        message: 'Selecciona al menos una pregunta',
        buttons: ['OK']
      })
      await alert.present()
      return
    }

    this.router.navigate(['/tabs/quiz'], {
      state: { questions: selected }
    })
  }

  isHoy(date: Date) {
    return date?.toDateString() === new Date().toDateString()
  }

  isSeleccionado(date: Date) {
    return date?.toDateString() === this.diaSeleccionado?.toDateString()
  }

  toggleSeleccionTodas() {
    this.fallosDia.forEach(f => {
      f.selectedPending = this.seleccionarTodas;
    });
  }

  toggleSeleccionTodasPendientes() {
    this.pendientesDia.forEach(p => {
      p.selectedPending = this.seleccionarTodasPendientes;
    });
  }

  get pendientesSeleccionadas(): number {
    return this.pendientesDia.filter(p => p.selectedPending).length;
  }

  get totalSeleccionadas(): number {
    return this.fallosSeleccionados + this.pendientesSeleccionadas;
  }
}