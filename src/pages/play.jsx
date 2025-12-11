import React from 'react'
import PageTransition from '../components/PageTransition'
import TicTacToe from '../components/TicTacToe'

export default function PlayPage() {
  return (
    <PageTransition>
      <div className="p-6">
        <TicTacToe />
      </div>
    </PageTransition>
  )
}
