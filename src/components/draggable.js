import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {dispatch} from '../util/event_manager';

class Draggable extends Component {
	constructor(props) {
		super(props);
		this.state = {
			startX: null,
			startY: null,
			isDragging: false,
			wasClicked: false,
			xClickOffset: 0,
			yClickOffset: 0,
			didMoveMinDistanceDuringDrag: false,
			dragSensitivityX: 15,
			dragSensitivityY: 15
		};
		this.pointerSupport = !!window.PointerEvent;
		this.onPointerMove = this.onPointerMove.bind(this);
		this.dragAndDropGroup = {
			id: this.props.dragAndDropGroup,
			moveEvent: this.props.dragAndDropGroup + '-MOVE',
			resetEvent: this.props.dragAndDropGroup + '-RESET',
			startEvent: this.props.dragAndDropGroup + '-START',
			endEvent: this.props.dragAndDropGroup + '-END'
		};
	}

	componentWillUnmount() {
		cancelAnimationFrame(this.frame);
		this.frame = null;
	}

	onPointerDown(e) {
		if (e.target.id === 'actions-btn' || e.target.className.includes('action')) {
			return;
		}
		if (this.props.disableDrag) {
			return;
		}
		if (!this.pointerSupport) {
			document.addEventListener('mousemove', this.onPointerMove, true);
		}

		if (!this.pointerSupport || e.buttons === 1 || e.pointerType === 'touch') {
			if (this.droppableDraggedOver !== null || this.draggableHoveringOver !== null) {
				const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
				dispatch(this.dragAndDropGroup.moveEvent, sourceObject, null, null, null, null);
				this.droppableDraggedOver = null;
				this.draggableHoveringOver = null;
			}
			e.preventDefault();
			e.stopPropagation();
			let x = e.clientX;
			let y = e.clientY;
			let cardWidth = this.draggable.offsetWidth;
			const cardTop = this.draggable.getBoundingClientRect().top;
			const cardLeft = this.draggable.getBoundingClientRect().left;
			if (this.pointerSupport && e.pointerId != null) {
				this.draggable.setPointerCapture(e.pointerId);
			}
			this.setState({
				width: cardWidth,
				didMoveMinDistanceDuringDrag: false,
				minDragDistanceMoved: false,
				startX: x,
				startY: y,
				wasClicked: true,
				isDragging: false,
				// +8 for margin
				xClickOffset: Math.abs(x - cardLeft) + 8,
				yClickOffset: Math.abs(y - cardTop) + 8
			});
			const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
			dispatch(this.dragAndDropGroup.startEvent, sourceObject, x, y);
		}
	}
	onPointerUp(e) {
		e.preventDefault();
		e.stopPropagation();
		if (this.props.disableDrag) {
			return;
		}
		if (!this.pointerSupport) {
			document.removeEventListener('mousemove', this.onPointerMove);
		}
		if (this.pointerSupport && e.pointerId) {
			this.draggable.releasePointerCapture(e.pointerId);
		}
		if (this.state.didMoveMinDistanceDuringDrag && this.state.minDragDistanceMoved) {
			dispatch(this.dragAndDropGroup.endEvent);
		}
		dispatch(this.dragAndDropGroup.resetEvent);
		this.draggableHoveringOver = null;
		this.setState({
			isDragging: false,
			didMoveMinDistanceDuringDrag: false,
			minDragDistanceMoved: false,
			cardLeft: 0,
			cardTop: 0,
			top: null,
			left: null,
			wasClicked: false
		});
	}
	onPointerCancel() {
		if (!this.pointerSupport) {
			document.removeEventListener('mousemove', this.onPointerMove);
		}
		dispatch(this.dragAndDropGroup.resetEvent);
		this.draggableHoveringOver = null;
		this.setState({
			isDragging: false,
			didMoveMinDistanceDuringDrag: false,
			minDragDistanceMoved: false,
			left: null,
			top: null,
			cardLeft: 0,
			cardTop: 0,
			wasClicked: false
		});
	}

	onPointerMove(e) {
		e.preventDefault();
		e.stopPropagation();
		if (this.props.disableDrag || !this.state.wasClicked) {
			return;
		}
		if (!this.pointerSupport || e.buttons === 1 || e.pointerType === 'touch') {
			const moveCard = (x, y) => {
				let droppableDraggedOver = this.getDroppableElemUnderDrag(x, y);
				let draggableHoveringOver = this.getDraggableElemUnderDrag(x, y);
				const newLeft = x - this.state.xClickOffset;
				const newTop = y - this.state.yClickOffset;
				const minDistanceMoved = Math.abs(this.state.startX - x) > this.state.dragSensitivityX || Math.abs(this.state.startY - y) > this.state.dragSensitivityY;
				if (minDistanceMoved && !this.state.minDragDistanceMoved) {
					this.setState({didMoveMinDistanceDuringDrag: true});
				}
				if (!minDistanceMoved && !this.state.didMoveMinDistanceDuringDrag) {
					const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
					dispatch(this.dragAndDropGroup.moveEvent, sourceObject, null, null, null, null);
					return;
				}
				if (!droppableDraggedOver) {
					dispatch(this.dragAndDropGroup.resetEvent);
				}
				// We're hovering over a droppable and a draggable
				if (droppableDraggedOver && draggableHoveringOver && (this.state.didMoveMinDistanceDuringDrag || this.state.minDragDistanceMoved || minDistanceMoved)) {
					if (!draggableHoveringOver.getAttribute('draggableid').includes('placeholder')) {
						if (this.droppableDraggedOver !== droppableDraggedOver || this.draggableHoveringOver !== draggableHoveringOver.getAttribute('draggableid')) {
							const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
							dispatch(this.dragAndDropGroup.moveEvent, sourceObject, droppableDraggedOver.getAttribute('droppableid'), draggableHoveringOver.getAttribute('draggableid'), x, y);
							this.droppableDraggedOver = droppableDraggedOver;
							this.draggableHoveringOver = draggableHoveringOver.getAttribute('draggableid');
						}
					}
				} else if (droppableDraggedOver && (minDistanceMoved || this.state.didMoveMinDistanceDuringDrag || this.state.minDragDistanceMoved)) {
					// We're hovering over a droppable, but no draggable
					this.droppableDraggedOver = droppableDraggedOver;
					this.draggableHoveringOver = null;
					const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
					dispatch(this.dragAndDropGroup.moveEvent, sourceObject, droppableDraggedOver.getAttribute('droppableid'), null, x, y);
				}
				this.setState({
					isDragging: true,
					// We need to move more than the drag sensitivity before we consider it an intended drag
					minDragDistanceMoved: minDistanceMoved,
					left: newLeft,
					top: newTop
				});
			};
			const x = e.clientX;
			const y = e.clientY;
			requestAnimationFrame(() => moveCard(x, y));
		} else {
			this.onPointerCancel();
		}
	}

	getDroppableElemUnderDrag(x, y) {
		let colUnder = null;
		// The Element we're dragging
		//let draggingElement = document.elementFromPoint(x, y);
		//draggingElement = this.getDraggableParentElement(draggingElement);
		let draggingElement = this.draggable;
		// Disable pointer events to look through element
		if (draggingElement) {
			draggingElement.style.pointerEvents = 'none';
			// Call something here to force recalculate style
			//draggingElement.getBoundingClientRect();
			// Get element under dragged  (look through)
			let elementUnder = document.elementFromPoint(x, y);
			// Reset dragged element's pointers
			draggingElement.style.pointerEvents = 'all';
			colUnder = this.getDroppableParentElement(elementUnder);
		} /*else {
			let elementUnder = document.elementFromPoint(x, y);
			colUnder = this.getDroppableParentElement(elementUnder);
		}*/
		return colUnder;
	}

	getDraggableElemUnderDrag(x, y) {
		if (!this.state.wasClicked || !this.state.minDragDistanceMoved) {
			return;
		}
		let cardUnder = null;
		// The Element we're dragging
		let draggingElement = this.draggable;
		// Disable pointer events to look through element
		if (draggingElement) {
			draggingElement.style.pointerEvents = 'none';
			// Call something here to force recalculate style?
			//draggingElement.getBoundingClientRect();
			// Get element under dragged tasks (look through)
			let elementUnder = document.elementFromPoint(x, y);
			// Reset dragged element's pointers
			cardUnder = this.getDraggableParentElement(elementUnder);
			if (!cardUnder) {
				//console.log('Retry above');
				// Try again just above, to avoid weird flickers in the spaces between cards
				/*elementUnder = document.elementFromPoint(x, y + 5);
				cardUnder = this.getDraggableParentElement(elementUnder);
				console.log('found', cardUnder);*/
			}
			draggingElement.style.pointerEvents = 'all';
		}
		return cardUnder;
	}

	getDroppableParentElement(element) {
		let count = 0;
		let maxTries = 15;
		let droppableParentElem = null;
		while (element && element.parentNode && !droppableParentElem && element.tagName !== 'body' && count <= maxTries) {
			const dragAndDropGroup = element.getAttribute('droppablegroup');
			if (dragAndDropGroup && dragAndDropGroup.includes(this.props.dragAndDropGroup)) {
				droppableParentElem = element;
			}
			element = element.parentNode;
			count++;
		}
		return droppableParentElem;
	}

	getDraggableParentElement(element) {
		let count = 0;
		let maxTries = 10;
		let draggableParentElem = null;
		while (element && element.parentNode && !draggableParentElem && element.tagName !== 'body' && count <= maxTries) {
			if (element.getAttribute('draggableid')) {
				draggableParentElem = element;
				break;
			}
			element = element.parentNode;
			count++;
		}
		return draggableParentElem;
	}

	handlePointerCaptureLoss(e) {
		if (this.state.wasClicked && e.pointerId) {
			this.draggable.setPointerCapture(e.pointerId);
		}
	}

	render() {
		const active = this.state.isDragging && this.state.wasClicked;
		const styles = {
			cursor: 'move',
			position: this.state.didMoveMinDistanceDuringDrag || this.state.minDragDistanceMoved ? 'fixed' : '',
			width: this.state.width,
			transition: 'none',
			animation: 'none',
			zIndex: 500,
			top: this.state.minDragDistanceMoved || this.state.didMoveMinDistanceDuringDrag ? this.state.top + 'px' : 0,
			left: this.state.minDragDistanceMoved || this.state.didMoveMinDistanceDuringDrag ? this.state.left + 'px' : 0
		};

		const propsObject = {
			'data-cy': 'draggable-' + this.props.draggableId,
			className: 'draggable',
			style: active ? {...styles} : {transform: 'none', transition: 'all 1s ease-in', top: 0, left: 0, cursor: this.state.wasClicked ? 'move' : 'grab'},
			key: this.props.draggableId,
			draggableid: this.props.draggableId,
			index: this.props.innerIndex,
			onPointerDown: e => (this.pointerSupport ? this.onPointerDown(e) : null),
			onPointerMove: e => (this.pointerSupport ? this.onPointerMove(e) : null),
			onPointerUp: e => (this.pointerSupport ? this.onPointerUp(e) : null),
			onPointerCancel: e => (this.pointerSupport ? this.onPointerCancel(e) : null),
			onMouseDown: e => (!this.pointerSupport ? this.onPointerDown(e) : null),
			onMouseUp: e => (!this.pointerSupport ? this.onPointerUp(e) : null),
			onLostPointerCapture: e => this.handlePointerCaptureLoss(e),
			tabIndex: '0',
			ref: div => (this.draggable = div),
			'aria-grabbed': true,
			'aria-dropeffect': 'move'
		};

		const CustomTag = this.props.tagName;

		return <CustomTag {...propsObject}>{this.props.children}</CustomTag>;
	}
}

Draggable.propTypes = {
	dragAndDropGroup: PropTypes.string.isRequired,
	draggableId: PropTypes.string.isRequired,
	dragDisabled: PropTypes.bool
};

export default Draggable;