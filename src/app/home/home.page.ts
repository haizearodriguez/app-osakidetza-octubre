import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonIcon, IonChip, IonAccordionGroup, IonAccordion } from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { QuestionService } from '../services/question.service';

interface Block { start: number, end: number, selected: boolean }
interface BlockGroup { type: string, blocks: Block[] }

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonAccordion, IonAccordionGroup, 
    IonButton, IonContent, FormsModule, CommonModule, RouterLink, IonIcon,
    IonChip
  ]
})
export class HomePage {

  readonly blockSize = 50
  blockGroups: BlockGroup[] = []
  private questions: any[] = []

  constructor(private questionService: QuestionService, private router: Router) {}

  async ionViewWillEnter() {
    this.questions = await this.questionService.getCombined()

    const maxByType = new Map<string, number>()
    this.questions.forEach(q => {
      maxByType.set(q.type, Math.max(maxByType.get(q.type) || 0, q.id))
    })

    // conserva la selección previa si ya existía
    const prev = new Set(this.selectedKeys())
    this.blockGroups = [...maxByType.entries()].map(([type, max]) => ({
      type,
      blocks: Array.from({ length: Math.ceil(max / this.blockSize) }, (_, i) => {
        const start = i * this.blockSize + 1
        return { start, end: Math.min((i + 1) * this.blockSize, max), selected: prev.has(`${type}_${start}`) }
      })
    }))
  }

  private selectedKeys() {
    return this.blockGroups.flatMap(g => g.blocks.filter(b => b.selected).map(b => `${g.type}_${b.start}`))
  }

  private questionsSelected() {
    const ranges = this.blockGroups.flatMap(g =>
      g.blocks.filter(b => b.selected).map(b => ({ type: g.type, start: b.start, end: b.end })))
    return this.questions
      .filter(q => ranges.some(r => r.type === q.type && q.id >= r.start && q.id <= r.end))
      .map(q => ({ id: q.id, type: q.type }))
  }

  get selectedCount() {
    return this.questionsSelected().length
  }

  clearBlocks() {
    this.blockGroups.forEach(g => g.blocks.forEach(b => b.selected = false))
  }

  startBlocks() {
    const selected = this.questionsSelected()
    if (selected.length === 0) return
    this.router.navigate(['/tabs/quiz'], { state: { questions: selected } })
  }
}