import { EventManager, ReactThreeFiber, RootState, useThree } from '@react-three/fiber'
import { DomEvent } from '@react-three/fiber/dist/declarations/src/core/events'
import * as React from 'react'
import * as THREE from 'three'
import { PointerLockControls as PointerLockControlsImpl, STATE } from 'three-stdlib'

export type PointerLockControlsProps = ReactThreeFiber.Object3DNode<
  PointerLockControlsImpl,
  typeof PointerLockControlsImpl
> & {
  domElement?: HTMLElement
  selector?: string
  enabled?: boolean
  camera?: THREE.Camera
  onChange?: (e?: THREE.Event) => void
  onLock?: (e?: THREE.Event) => void
  onUnlock?: (e?: THREE.Event) => void
}

export const PointerLockControls = React.forwardRef<PointerLockControlsImpl, PointerLockControlsProps>(
  ({ domElement, selector, onChange, onLock, onUnlock, enabled = true, ...props }, ref) => {
    const { camera, ...rest } = props
    const get = useThree((state) => state.get)
    const setEvents = useThree((state) => state.setEvents)
    const gl = useThree((state) => state.gl)
    const defaultCamera = useThree((state) => state.camera)
    const invalidate = useThree((state) => state.invalidate)
    const events = useThree((state) => state.events) as EventManager<HTMLElement>
    const explCamera = camera || defaultCamera
    const explDomElement = (domElement || events.connected || gl.domElement) as HTMLElement

    const [controls] = React.useState(() => new PointerLockControlsImpl(explCamera))

    React.useEffect(() => {
      if (enabled) {
        controls.connect(explDomElement)
        // Force events to be centered while PLC is active
        const oldComputeOffsets = get().events.compute
        setEvents({
          compute(event: DomEvent, state: RootState) {
            const offsetX = state.size.width / 2
            const offsetY = state.size.height / 2
            state.pointer.set((offsetX / state.size.width) * 2 - 1, -(offsetY / state.size.height) * 2 + 1)
            state.raycaster.setFromCamera(state.pointer, state.camera)
          },
        })
        return () => {
          controls.disconnect()
          setEvents({ compute: oldComputeOffsets })
        }
      }
    }, [enabled, controls])

    React.useEffect(() => {
      const callback = (e: THREE.Event) => {
        invalidate()
        if (onChange) onChange(e)
      }

      controls.addEventListener('change', callback)

      if (onLock) controls.addEventListener('lock', onLock)
      if (onUnlock) controls.addEventListener('unlock', onUnlock)

      // Enforce previous interaction
      const handler = () => controls.lock()
      const elements = selector ? Array.from(document.querySelectorAll(selector)) : [document]
      elements.forEach((element) => element && element.addEventListener('click', handler))

      return () => {
        controls.removeEventListener('change', callback)
        if (onLock) controls.addEventListener('lock', onLock)
        if (onUnlock) controls.addEventListener('unlock', onUnlock)
        elements.forEach((element) => (element ? element.removeEventListener('click', handler) : undefined))
      }
    }, [onChange, onLock, onUnlock, selector])

    return <primitive ref={ref} object={controls} {...rest} />
  }
)
