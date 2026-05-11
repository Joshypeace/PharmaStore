import { Suspense } from 'react';
import SearchClient from './searchClient'

export default function Page(){
  return(
    <Suspense fallback={<div>Loading...</div>}>
      <SearchClient />
    </Suspense>
  )

}