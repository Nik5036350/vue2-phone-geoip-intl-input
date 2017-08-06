<template>
    <div v-on:click="(e)=>{e.stopPropagation()}" class="react-tel-input">
        <input
            placeholder="+1 (702) 123-4567"
            defaultCountry=""
            v-on:keyup="handleInput"
            onClick={this.handleInputClick}
            onFocus={this.handleInputFocus}
            onKeyDown={this.handleInputKeyDown}
            v-model="state.formattedNumber"
            ref="numberInput"
            type="tel"
        />
        <div 
        v-on:click="onFlagClick"
        ref="flagDropDownButton" 
        :class="{ 'flag-dropdown': true, 'open-dropdown': state.showDropDown === true }"
        onKeyDown={this.handleKeydown} >
            <div ref='selectedFlag'
                onClick={this.handleFlagDropdownClick}
                class='selected-flag'>
                <div v-bind:class="`flag ${state.selectedCountry.iso2}`"></div>
                </div>
            </div>
            <ul class="country-list" v-if="isCountriesSelectOpen">
                <li
                    v-for="country in state.preferredCountries"
					v-bind:key="country.iso2"
                    v-on:click="handleFlagItemClick(country)"
                    :class="{ country: true,
                        preferred: country.iso2 === 'us' || country.iso2 === 'gb',
                        active: country.iso2 === 'us',
                    }"
					data-dial-code="1"
					data-country-code="country.iso2"
                    data-suka="country.name">
					<div v-bind:class="`flag ${country.iso2}`" />
					<span class='country-name'>{{country.name}}</span>
					<span class='dial-code'>{{"+" + country.dialCode}}</span>
				</li>
            </ul>
        </div>
</template>

<script>

    require('./react-phone-input-style.less');
    import { some, find, reduce, map, filter, includes } from 'lodash/collection';
    import { findIndex, head, tail } from 'lodash/array';
    import { debounce, memoize } from 'lodash/function';
    import { trim, startsWith } from 'lodash/string';
    import countryData from './country_data.js';

    let allCountries = countryData.allCountries;

    let isModernBrowser = Boolean(document.createElement('input').setSelectionRange);

    var style = require('./react-phone-input-style.less');

    let keys = {
        UP: 38,
        DOWN: 40,
        RIGHT: 39,
        LEFT: 37,
        ENTER: 13,
        ESC: 27,
        PLUS: 43,
        A: 65,
        Z: 90,
        SPACE: 32
    };

    function isNumberValid(inputNumber) {
        let countries = countryData.allCountries;
        return some(countries, function(country) {
            return startsWith(inputNumber, country.dialCode) || startsWith(country.dialCode, inputNumber);
        });
    }

    function getOnlyCountries(onlyCountriesArray) {
        if (onlyCountriesArray.length === 0) {
            return allCountries;
        } else {
            let selectedCountries = [];
            allCountries.map(function(country) {
            onlyCountriesArray.map(function(selCountry){
                if (country.iso2 === selCountry) {
                selectedCountries.push(country);
                }
            });
            });
            return selectedCountries;
        }
    }

    var _searchCountry = memoize(function(queryString){
        if(!queryString || queryString.length === 0) {
            return null;
        }
        // don't include the preferred countries in search
        let probableCountries = filter(this.state.onlyCountries, function(country) {
            return startsWith(country.name.toLowerCase(), queryString.toLowerCase());
        }, this);
        return probableCountries[0];
    });

    var _guessSelectedCountry = memoize(function(inputNumber, onlyCountries, defaultCountry) {
        var secondBestGuess = find(allCountries, {iso2: defaultCountry}) || onlyCountries[0];
        if(trim(inputNumber) !== '') {
                var bestGuess = reduce(onlyCountries, function(selectedCountry, country) {
                    if(startsWith(inputNumber, country.dialCode) || startsWith(inputNumber.replace('+', ''), country.dialCode)) {
                        if(country.dialCode.length > selectedCountry.dialCode.length) {
                            return country;
                        }
                        if(country.dialCode.length === selectedCountry.dialCode.length && country.priority < selectedCountry.priority) {
                            return country;
                        }
                    }

                    return selectedCountry;
                }, {dialCode: '', priority: 10001}, this);
        } else {
                return secondBestGuess;
        }

        if(!bestGuess.name) {
                return secondBestGuess;
        }

        return bestGuess;
    });
            
    function excludeCountries(selectedCountries, excludedCountries) {
        if(excludedCountries.length === 0) {
            return selectedCountries;
        } else {
            return filter(selectedCountries, function(selCountry) {
            return !includes(excludedCountries, selCountry.iso2);
            });
        }
    }

    export default {
        name: 'bPhoneInput',
        props: {
            placeholder: String,
            value: String,
            autoFormat: Boolean,
            ipGeocodingEnabled: Boolean,
            defaultCountry: String,
            onlyCountries: {
                default: () => [],
                type: [String]
            },
            excludeCountries: {
                default: () => [],
                type: [String]
            },
            preferredCountries: [String],
            onChange: { type: Function },
            onFocus: Function,
            onClick: Function,
            onKeyDown: Function
        },
        data(){
            return {
                showDropDown: false,
                formattedNumber:'',
                inputFlagClasses: '',
                isCountriesSelectOpen: false,
                state: {
                    showDropDown: false,
                    formattedNumber: '',
                    preferredCountries:[],
                    selectedCountry: null,
                    ipGeocodingEnabled: true
                }
            }
        },
        methods: {
            onFlagClick(){
                this.isCountriesSelectOpen = !this.isCountriesSelectOpen
            },
            getNumber() {
                return this.state.formattedNumber !== '+' ? this.state.formattedNumber : '';
            },

            getValue() {
                return this.getNumber();
            },

            resetNumber() {
                let formattedNumber = this.formatNumber(this.state.selectedCountry.dialCode, this.state.selectedCountry.format);
                this.state.formattedNumber = formattedNumber
            },

            updateDefaultCountry(country) {
                const newSelectedCountry = find(this.state.onlyCountries, {iso2: country});
                this.state.defaultCountry = country
                this.state.selectedCountry = newSelectedCountry
                this.state.formattedNumber = '+' + newSelectedCountry.dialCode
            },
            /**
             * Close dropdown if clicked outside.
             */
             formatNumber(text, pattern) {
                 
                if(!text || text.length === 0) {
                    return '+';
                }

                // for all strings with length less than 3, just return it (1, 2 etc.)
                // also return the same text if the selected country has no fixed format
                if((text && text.length < 2) || !pattern || !this.autoFormat) {
                return `+${text}`;
                }

                let formattedObject = reduce(pattern, function(acc, character) {
                if(acc.remainingText.length === 0) {
                    return acc;
                }

                if(character !== '.') {
                    return {
                    formattedText: acc.formattedText + character,
                    remainingText: acc.remainingText
                    };
                }

                return {
                    formattedText: acc.formattedText + head(acc.remainingText),
                    remainingText: tail(acc.remainingText)
                };
                }, {formattedText: '', remainingText: text.split('')});
                return formattedObject.formattedText + formattedObject.remainingText.join('');
            },

            // put the cursor to the end of the input (usually after a focus event)
            _cursorToEnd() {
                let input = ReactDOM.findDOMNode(this.refs.numberInput);
                input.focus();
                if (isModernBrowser) {
                let len = input.value.length;
                input.setSelectionRange(len, len);
                }
            },

            getElement(index) {
                return ReactDOM.findDOMNode(this.refs[`flag_no_${index}`]);
            },

            handleFlagDropdownClick() {
                // need to put the highlight on the current selected country if the dropdown is going to open up
                this.setState({
                showDropDown: !this.state.showDropDown,
                highlightCountry: find(this.state.onlyCountries, this.state.selectedCountry),
                highlightCountryIndex: findIndex(this.state.onlyCountries, this.state.selectedCountry)
                }, () => {
                if(this.state.showDropDown) {
                    this.scrollTo(this.getElement(this.state.highlightCountryIndex + this.state.preferredCountries.length));
                }
                });
            },

            handleInput(event) {
                
                let formattedNumber = '+', newSelectedCountry = this.state.selectedCountry,
                        freezeSelection = this.state.freezeSelection;

                //Does not exceed 16 digit phone number limit
                if(event.target.value.replace(/\D/g, '').length > 16) {
                return;
                }

                // if the input is the same as before, must be some special key like enter etc.
                // if(event.target.value === this.state.formattedNumber) {
                // return;
                // }

                // ie hack
                if(event.preventDefault) {
                event.preventDefault();
                } else {
                event.returnValue = false;
                }

                if(event.target.value.length > 0) {
                // before entering the number in new format, lets check if the dial code now matches some other country
                let inputNumber = event.target.value.replace(/\D/g, '');

                // we don't need to send the whole number to guess the country... only the first 6 characters are enough
                // the guess country function can then use memoization much more effectively since the set of input it
                        // gets has drastically reduced
                if(!this.state.freezeSelection || this.state.selectedCountry.dialCode.length > inputNumber.length) {
                    newSelectedCountry = this.guessSelectedCountry(inputNumber.substring(0, 6), this.state.onlyCountries, this.state.defaultCountry);
                    freezeSelection = false;
                }
                // let us remove all non numerals from the input
                formattedNumber = this.formatNumber(inputNumber, newSelectedCountry.format);
                }

                let caretPosition = event.target.selectionStart;
                let oldFormattedText = this.state.formattedNumber;
                let diff = formattedNumber.length - oldFormattedText.length;

                this.state.formattedNumber = formattedNumber
                this.formattedNumber = formattedNumber
                this.state.freezeSelection = freezeSelection
                this.state.selectedCountry = newSelectedCountry.dialCode.length > 0 ? newSelectedCountry : this.state.selectedCountry
                this.inputFlagClasses = `flag ${this.state.selectedCountry.iso2}`;

                this.onChange(this.formattedNumber)
                // (() => {
                //     if(isModernBrowser) {
                //         if(diff > 0) {
                //         caretPosition = caretPosition - diff;
                //         }

                //         if(caretPosition > 0 && oldFormattedText.length >= formattedNumber.length) {
                //         ReactDOM.findDOMNode(this.refs.numberInput).setSelectionRange(caretPosition, caretPosition);
                //         }
                //     }

                //     if(this.onChange) {
                //         this.onChange(this.state.formattedNumber);
                //     }
                // })()
                // this.setState({
                // formattedNumber: formattedNumber,
                // freezeSelection: freezeSelection,
                // selectedCountry: newSelectedCountry.dialCode.length > 0 ? newSelectedCountry : this.state.selectedCountry
                // }, function() {
                // if(isModernBrowser) {
                //     if(diff > 0) {
                //     caretPosition = caretPosition - diff;
                //     }

                //     if(caretPosition > 0 && oldFormattedText.length >= formattedNumber.length) {
                //     ReactDOM.findDOMNode(this.refs.numberInput).setSelectionRange(caretPosition, caretPosition);
                //     }
                // }

                // if(this.onChange) {
                //     this.onChange(this.state.formattedNumber);
                // }
                // });
            },

            handleInputClick(evt) {
                this.state.showDropDown = false
                if (this.onClick) {
                    this.onClick(evt)
                }
            },

            handleFlagItemClick(country) {
                
                let currentSelectedCountry = this.state.selectedCountry;
                let nextSelectedCountry = find(this.state.onlyCountries, country);

                if(currentSelectedCountry.iso2 !== nextSelectedCountry.iso2) {
                    // TODO - the below replacement is a bug. It will replace stuff from middle too
                let newNumber = this.state.formattedNumber.replace(currentSelectedCountry.dialCode, nextSelectedCountry.dialCode);
                let formattedNumber = this.formatNumber(newNumber.replace(/\D/g, ''), nextSelectedCountry.format);

                this.state.showDropDown = false
                this.state.selectedCountry = nextSelectedCountry
                this.state.freezeSelection = true
                this.state.formattedNumber = formattedNumber
                this.isCountriesSelectOpen = false
                
                // (() => {
                //     this._cursorToEnd();
                //     if(this.onChange) {
                //     this.onChange(formattedNumber);
                //     }
                // })()

                // this.setState({
                //     showDropDown: false,
                //     selectedCountry: nextSelectedCountry,
                //     freezeSelection: true,
                //     formattedNumber: formattedNumber
                // }, function() {
                //     this._cursorToEnd();
                //     if(this.onChange) {
                //     this.onChange(formattedNumber);
                //     }
                // });
                }
            },

            handleInputFocus(evt) {
                // if the input is blank, insert dial code of the selected country
                if(ReactDOM.findDOMNode(this.refs.numberInput).value === '+') {
                    this.state.formattedNumber = '+' + this.state.selectedCountry.dialCode
                    (() => setTimeout(this._cursorToEnd, 10))()
                // this.setState({formattedNumber: '+' + this.state.selectedCountry.dialCode}, () => setTimeout(this._cursorToEnd, 10));
                }

                if (this.onFocus) {
                    this.onFocus(evt)
                }
            },

            _getHighlightCountryIndex(direction) {
                // had to write own function because underscore does not have findIndex. lodash has it
                var highlightCountryIndex = this.state.highlightCountryIndex + direction;

                if(highlightCountryIndex < 0
                || highlightCountryIndex >= (this.state.onlyCountries.length  + this.state.preferredCountries.length)) {
                return highlightCountryIndex - direction;
                }

                return highlightCountryIndex;
            },

            searchCountry() {
                const probableCandidate = this._searchCountry(this.state.queryString) || this.state.onlyCountries[0];
                const probableCandidateIndex = findIndex(this.state.onlyCountries, probableCandidate) +
                        this.state.preferredCountries.length;

                this.scrollTo(this.getElement(probableCandidateIndex), true);
                
                this.state.queryString = ''
                this.state.highlightCountryIndex = probableCandidateIndex

                // this.setState({
                //     queryString: '',
                //     highlightCountryIndex: probableCandidateIndex
                // });
            },

            handleInputKeyDown(event) {
                if(event.which === keys.ENTER) {
                this.onEnterKeyPress(event);
                }

                if (this.onKeyDown) {
                this.onKeyDown(event)
                }
            },

            handleClickOutside() {
                if(this.state.showDropDown) {
                    this.state.showDropDown = false
                
                // this.setState({
                //     showDropDown: false
                // });
                }
            },

            scrollTo(country, middle) {
                if(!country) return;

                let container = ReactDOM.findDOMNode(this.refs.flagDropdownList);

                if(!container) return;

                let containerHeight = container.offsetHeight;
                let containerOffset = container.getBoundingClientRect();
                let containerTop = containerOffset.top + document.body.scrollTop;
                let containerBottom = containerTop + containerHeight;

                let element = country;
                let elementOffset = element.getBoundingClientRect();

                let elementHeight = element.offsetHeight;
                let elementTop = elementOffset.top + document.body.scrollTop;
                let elementBottom = elementTop + elementHeight;
                let newScrollTop = elementTop - containerTop + container.scrollTop;
                let middleOffset = (containerHeight / 2) - (elementHeight / 2);

                if (elementTop < containerTop) {
                // scroll up
                if (middle) {
                    newScrollTop -= middleOffset;
                }
                container.scrollTop = newScrollTop;
                } else if (elementBottom > containerBottom) {
                // scroll down
                if(middle) {
                    newScrollTop += middleOffset;
                }
                var heightDifference = containerHeight - elementHeight;
                container.scrollTop = newScrollTop - heightDifference;
                }
            },

            handleKeydown(event) {
                
                if(!this.state.showDropDown) {
                return;
                }

                // ie hack
                if(event.preventDefault) {
                event.preventDefault();
                } else {
                event.returnValue = false;
                }

                function _moveHighlight(direction) {
                    this.state.highlightCountryIndex =this._getHighlightCountryIndex(direction)
                    (() => {
                        this.scrollTo(this.getElement(this.state.highlightCountryIndex), true);
                    })()

                    // this.setState({
                    //     highlightCountryIndex: this._getHighlightCountryIndex(direction)
                    // }, () => {
                    //     this.scrollTo(this.getElement(this.state.highlightCountryIndex), true);
                    // });
                }

                switch(event.which) {
                case keys.DOWN:
                    _moveHighlight(1);
                    break;
                case keys.UP:
                    _moveHighlight(-1);
                    break;
                case keys.ENTER:
                    this.handleFlagItemClick(this.state.onlyCountries[this.state.highlightCountryIndex], event);
                    break;
                case keys.ESC:
                    this.state.showDropDown
                    // this.setState({showDropDown: false}, this._cursorToEnd);
                    break;
                default:
                    if ((event.which >= keys.A && event.which <= keys.Z) || event.which === keys.SPACE) {
                        this.state.queryString = this.state.queryString + String.fromCharCode(event.which)
                        
                    // this.setState({
                    //     queryString: this.state.queryString + String.fromCharCode(event.which)
                    // }, this.state.debouncedQueryStingSearcher);
                    }
                }
            },

            _searchCountry: _searchCountry,
            guessSelectedCountry: _guessSelectedCountry,

            getJSON(url, callback) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'json';
                xhr.onload = function() {
                    var status = xhr.status;
                    if (status == 200) {
                        callback(null, xhr.response);
                    } else {
                        callback(status);
                    }
                };
                xhr.send();
            }
            
        },
        
        created() {
            
            
            
            if (window !== undefined) {
                // document.addEventListener('keydown', this.handleKeydown);
                document.addEventListener('click', ()=>{this.isCountriesSelectOpen = false})
            }

            let inputNumber = this.value || '';
            let onlyCountries = excludeCountries(getOnlyCountries(this.onlyCountries), this.excludeCountries);
            // let selectedCountryGuess = find(onlyCountries, {iso2: this.defaultCountry});
            let selectedCountryGuess = this.guessSelectedCountry(this.value, allCountries, this.defaultCountry);
            let selectedCountryGuessIndex = findIndex(allCountries, selectedCountryGuess);
            let dialCode = selectedCountryGuess && !startsWith(inputNumber.replace(/\D/g, ''), selectedCountryGuess.dialCode) ? selectedCountryGuess.dialCode : '';
            let formattedNumber = this.formatNumber(dialCode + inputNumber.replace(/\D/g, ''), selectedCountryGuess ? selectedCountryGuess.format : null);
            let preferredCountries = allCountries
            //let preferredCountries = filter(allCountries, (country) => {
              //  return some(this.preferredCountries, (preferredCountry) => {
                //    return preferredCountry === country.iso2;
                //});
            //});
            this.getNumber = this.getNumber.bind(this);
            this.getValue = this.getValue.bind(this);
            this.resetNumber = this.resetNumber.bind(this);
            this.scrollTo = this.scrollTo.bind(this);
            this.formatNumber = this.formatNumber.bind(this);
            this._cursorToEnd = this._cursorToEnd.bind(this);
            this.guessSelectedCountry = this.guessSelectedCountry.bind(this);
            this.getElement = this.getElement.bind(this);
            this.handleFlagDropdownClick = this.handleFlagDropdownClick.bind(this);
            this.handleInput = this.handleInput.bind(this);
            this.handleInputClick = this.handleInputClick.bind(this);
            this.handleFlagItemClick = this.handleFlagItemClick.bind(this);
            this.handleInputFocus = this.handleInputFocus.bind(this);
            this._getHighlightCountryIndex = this._getHighlightCountryIndex.bind(this);
            this._searchCountry = this._searchCountry.bind(this);
            this.searchCountry = this.searchCountry.bind(this);
            this.handleKeydown = this.handleKeydown.bind(this);
            this.handleInputKeyDown = this.handleInputKeyDown.bind(this);
            // this.getCountryDropDownList = this.getCountryDropDownList.bind(this);

            this.state = {
                defaultCountry: this.defaultCountry,
                preferredCountries: preferredCountries,
                selectedCountry: selectedCountryGuess,
                highlightCountryIndex: selectedCountryGuessIndex,
                formattedNumber: formattedNumber,
                showDropDown: false,
                queryString: '',
                freezeSelection: false,
                debouncedQueryStingSearcher: debounce(this.searchCountry, 100),
                onlyCountries: onlyCountries,
                ipGeocodingEnabled: !(this.defaultCountry === false)
            };

            this.inputFlagClasses = `flag ${this.state.selectedCountry.iso2}`;

            if(this.state.ipGeocodingEnabled === true && !this.value){
                this.getJSON('https://ip-api.io/json/', 
                (error, data) => {
                    if(!error){
                        this.updateDefaultCountry( data.country_code.toLowerCase() )
                    }
                })
            }
        },
        beforeDestroy() {
            if (window !== undefined) {
                document.removeEventListener('click', this.clickedOutside)
                document.removeEventListener('keydown', this.handleKeydown);
            }
        }
    }

    
</script>
